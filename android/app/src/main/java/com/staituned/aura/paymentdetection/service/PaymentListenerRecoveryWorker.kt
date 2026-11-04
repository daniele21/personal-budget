package com.staituned.aura.paymentdetection.service

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.staituned.aura.paymentdetection.data.PaymentDetectionPrivacyStore
import com.staituned.aura.paymentdetection.data.PaymentDetectionSettingsStore
import com.staituned.aura.paymentdetection.listener.ListenerBindingAction
import com.staituned.aura.paymentdetection.listener.NotificationAccessController
import com.staituned.aura.paymentdetection.listener.PaymentDetectionListenerRuntime
import com.staituned.aura.paymentdetection.listener.PaymentListenerGeneration
import com.staituned.aura.paymentdetection.listener.PaymentListenerProbeResult
import java.util.concurrent.TimeUnit

internal enum class PaymentListenerRecoveryResult {
    DISABLED,
    NO_ACCESS,
    RECONCILED,
    RECONCILED_AND_REBIND_REQUESTED,
    /** No listener endpoint exists. A bind was requested, not confirmed. */
    BIND_REQUESTED,
    /** An existing but unresponsive endpoint was explicitly cycled. */
    REBIND_REQUESTED,
    SETTINGS_FAILURE,
    FAILED,
}

/**
 * Single owner for listener health decisions. Unlike the 1.0.15 watchdog, a
 * "connected" bit is not enough: every recovery pass probes the live service
 * and reconciles a bounded active-notification snapshot. A missing/failed probe
 * triggers a deliberate unbind/rebind cycle.
 */
/**
 * A missing endpoint is not an unresponsive bound endpoint. This selection is
 * intentionally unit-testable so a future recovery refactor cannot resume
 * unbinding a listener while Android is still trying to connect it.
 */
internal fun listenerBindingActionForProbe(
    probe: PaymentListenerProbeResult,
): ListenerBindingAction? = when (probe) {
    PaymentListenerProbeResult.UNAVAILABLE -> ListenerBindingAction.REQUEST_BIND
    PaymentListenerProbeResult.FAILED -> ListenerBindingAction.CYCLE_CONNECTED
    else -> null
}

internal class PaymentListenerRecoveryCoordinator(
    context: Context,
) {
    private val appContext = context.applicationContext

    fun recoverNow(): PaymentListenerRecoveryResult {
        val result = try {
            recoverOnce()
        } catch (_: RuntimeException) {
            PaymentListenerRecoveryResult.FAILED
        }
        PaymentDetectionListenerRuntime.markRecoveryResult(result.name)
        return result
    }

    private fun recoverOnce(): PaymentListenerRecoveryResult {
        val privacyStore = PaymentDetectionPrivacyStore(appContext)
        if (!privacyStore.hasActiveOwner()) {
            return PaymentListenerRecoveryResult.DISABLED
        }

        return try {
            val settings = PaymentDetectionSettingsStore(
                appContext,
                privacyStore,
            ).getSettings()
            if (!settings.requestedEnabled) {
                return PaymentListenerRecoveryResult.DISABLED
            }

            val accessController = NotificationAccessController(appContext)
            val access = accessController.synchronizeComponentLifecycle()
            if (access.currentGrantObservedBefore) {
                PaymentDetectionListenerRuntime.retireBinding(
                    PaymentListenerGeneration.LEGACY,
                )
            }
            val generation = access.effectiveGeneration
                ?: return PaymentListenerRecoveryResult.NO_ACCESS

            PaymentDetectionListenerRuntime.armHealthHeartbeat(generation)
            val probe = PaymentDetectionListenerRuntime.probeAndReconcile(generation)
            when (probe) {
                PaymentListenerProbeResult.HEALTHY ->
                    PaymentListenerRecoveryResult.RECONCILED
                PaymentListenerProbeResult.SKIPPED_DISABLED ->
                    PaymentListenerRecoveryResult.DISABLED
                PaymentListenerProbeResult.SETTINGS_FAILURE ->
                    PaymentListenerRecoveryResult.SETTINGS_FAILURE
                PaymentListenerProbeResult.MISSED_CALLBACK_RECOVERED -> {
                    if (accessController.forceRebindIfGranted()) {
                        PaymentListenerRecoveryResult.RECONCILED_AND_REBIND_REQUESTED
                    } else {
                        PaymentListenerRecoveryResult.FAILED
                    }
                }
                PaymentListenerProbeResult.UNAVAILABLE,
                PaymentListenerProbeResult.FAILED -> {
                    val requested = when (checkNotNull(listenerBindingActionForProbe(probe))) {
                        ListenerBindingAction.REQUEST_BIND ->
                            accessController.requestRebindIfGranted()
                        ListenerBindingAction.CYCLE_CONNECTED ->
                            accessController.forceRebindIfGranted()
                    }
                    when {
                        !requested -> PaymentListenerRecoveryResult.FAILED
                        probe == PaymentListenerProbeResult.UNAVAILABLE ->
                            PaymentListenerRecoveryResult.BIND_REQUESTED
                        else -> PaymentListenerRecoveryResult.REBIND_REQUESTED
                    }
                }
            }
        } catch (_: RuntimeException) {
            PaymentListenerRecoveryResult.FAILED
        }
    }
}

class PaymentListenerRecoveryWorker(
    appContext: Context,
    workerParameters: WorkerParameters,
) : Worker(appContext, workerParameters) {
    override fun doWork(): Result =
        when (
            PaymentListenerRecoveryCoordinator(applicationContext).recoverNow()
        ) {
            PaymentListenerRecoveryResult.FAILED,
            PaymentListenerRecoveryResult.SETTINGS_FAILURE -> Result.retry()
            else -> Result.success()
        }
}

/**
 * Failure to read current settings is not equivalent to opting out.
 * Existing worker instances must survive a transient storage failure;
 * the worker itself still enforces owner/opt-in before processing data.
 */
internal enum class RecoverySchedulingDecision {
    ENABLE,
    DISABLE,
    PRESERVE_EXISTING,
}

internal fun recoverySchedulingDecision(enabled: Boolean?): RecoverySchedulingDecision =
    when (enabled) {
        true -> RecoverySchedulingDecision.ENABLE
        false -> RecoverySchedulingDecision.DISABLE
        null -> RecoverySchedulingDecision.PRESERVE_EXISTING
    }

object PaymentListenerRecoveryScheduler {
    private const val PERIODIC_WORK =
        "aura-payment-listener-recovery-periodic-v2"
    private const val IMMEDIATE_WORK =
        "aura-payment-listener-recovery-immediate-v2"
    private const val LEGACY_PERIODIC_WORK =
        "aura-payment-listener-recovery-periodic-v1"
    private const val LEGACY_IMMEDIATE_WORK =
        "aura-payment-listener-recovery-immediate-v1"

    @JvmStatic
    fun sync(context: Context) {
        val appContext = context.applicationContext
        val enabled = try {
            val privacyStore = PaymentDetectionPrivacyStore(appContext)
            privacyStore.hasActiveOwner() &&
                PaymentDetectionSettingsStore(
                    appContext,
                    privacyStore,
                ).getSettings().requestedEnabled
        } catch (_: RuntimeException) {
            // A read failure must not erase scheduled recovery: otherwise a
            // temporary storage failure can leave the listener unmonitored
            // until another explicit enable/foreground visit.
            null
        }
        when (recoverySchedulingDecision(enabled)) {
            RecoverySchedulingDecision.PRESERVE_EXISTING -> return
            RecoverySchedulingDecision.DISABLE -> {
                cancelLegacy(appContext)
                cancel(appContext)
            }
            RecoverySchedulingDecision.ENABLE -> {
                cancelLegacy(appContext)
                schedule(appContext)
                // Do not cancel a pending recovery on each getStatus().
                enqueueImmediate(appContext, ExistingWorkPolicy.KEEP)
            }
        }
    }

    @JvmStatic
    fun schedule(context: Context) {
        val work = PeriodicWorkRequestBuilder<PaymentListenerRecoveryWorker>(
            15,
            TimeUnit.MINUTES,
        ).build()
        WorkManager.getInstance(context.applicationContext).enqueueUniquePeriodicWork(
            PERIODIC_WORK,
            ExistingPeriodicWorkPolicy.KEEP,
            work,
        )
    }

    /** Explicit user repair can supersede a pending recovery. */
    @JvmStatic
    fun runSoon(context: Context) {
        enqueueImmediate(context, ExistingWorkPolicy.REPLACE)
    }

    private fun enqueueImmediate(context: Context, policy: ExistingWorkPolicy) {
        val work = OneTimeWorkRequestBuilder<PaymentListenerRecoveryWorker>().build()
        WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
            IMMEDIATE_WORK,
            policy,
            work,
        )
    }

    @JvmStatic
    fun cancel(context: Context) {
        WorkManager.getInstance(context.applicationContext).apply {
            cancelUniqueWork(PERIODIC_WORK)
            cancelUniqueWork(IMMEDIATE_WORK)
        }
    }

    private fun cancelLegacy(context: Context) {
        WorkManager.getInstance(context.applicationContext).apply {
            cancelUniqueWork(LEGACY_PERIODIC_WORK)
            cancelUniqueWork(LEGACY_IMMEDIATE_WORK)
        }
    }
}
