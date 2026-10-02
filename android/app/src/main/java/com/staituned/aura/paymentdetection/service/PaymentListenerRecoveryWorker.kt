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
import com.staituned.aura.paymentdetection.listener.NotificationAccessController
import com.staituned.aura.paymentdetection.listener.PaymentDetectionListenerRuntime
import com.staituned.aura.paymentdetection.listener.PaymentListenerProbeResult
import java.util.concurrent.TimeUnit

internal enum class PaymentListenerRecoveryResult {
    DISABLED,
    NO_ACCESS,
    RECONCILED,
    RECONCILED_AND_REBIND_REQUESTED,
    REBIND_REQUESTED,
    FAILED,
}

/**
 * Single owner for listener health decisions. Unlike the 1.0.15 watchdog, a
 * "connected" bit is not enough: every recovery pass probes the live service
 * and reconciles a bounded active-notification snapshot. A missing/failed probe
 * triggers a deliberate unbind/rebind cycle.
 */
internal class PaymentListenerRecoveryCoordinator(
    context: Context,
) {
    private val appContext = context.applicationContext

    fun recoverNow(): PaymentListenerRecoveryResult {
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
            val generation = access.effectiveGeneration
                ?: return PaymentListenerRecoveryResult.NO_ACCESS

            PaymentDetectionListenerRuntime.armHealthHeartbeat(generation)
            when (
                PaymentDetectionListenerRuntime.probeAndReconcile(generation)
            ) {
                PaymentListenerProbeResult.HEALTHY ->
                    PaymentListenerRecoveryResult.RECONCILED
                PaymentListenerProbeResult.MISSED_CALLBACK_RECOVERED -> {
                    if (accessController.forceRebindIfGranted()) {
                        PaymentListenerRecoveryResult.RECONCILED_AND_REBIND_REQUESTED
                    } else {
                        PaymentListenerRecoveryResult.FAILED
                    }
                }
                PaymentListenerProbeResult.UNAVAILABLE,
                PaymentListenerProbeResult.FAILED -> {
                    if (accessController.forceRebindIfGranted()) {
                        PaymentListenerRecoveryResult.REBIND_REQUESTED
                    } else {
                        PaymentListenerRecoveryResult.FAILED
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
            PaymentListenerRecoveryResult.FAILED -> Result.retry()
            else -> Result.success()
        }
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
            false
        }
        cancelLegacy(appContext)
        if (!enabled) {
            cancel(appContext)
            return
        }
        schedule(appContext)
        runSoon(appContext)
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

    @JvmStatic
    fun runSoon(context: Context) {
        val work = OneTimeWorkRequestBuilder<PaymentListenerRecoveryWorker>().build()
        WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
            IMMEDIATE_WORK,
            ExistingWorkPolicy.REPLACE,
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
