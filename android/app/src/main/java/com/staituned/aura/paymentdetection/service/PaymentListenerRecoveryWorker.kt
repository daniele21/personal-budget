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
import java.util.concurrent.TimeUnit

/**
 * Native watchdog for the system NotificationListenerService binding.
 *
 * WorkManager survives normal app-process death. The worker reads no
 * notification content: it only checks the user's persisted enable state,
 * Android's listener grant and the in-process connection flag, then asks
 * Android to rebind when necessary.
 */
class PaymentListenerRecoveryWorker(
    appContext: Context,
    workerParameters: WorkerParameters,
) : Worker(appContext, workerParameters) {
    override fun doWork(): Result {
        val privacyStore = PaymentDetectionPrivacyStore(applicationContext)
        if (!privacyStore.hasActiveOwner()) return Result.success()

        return try {
            val settings = PaymentDetectionSettingsStore(
                applicationContext,
                privacyStore,
            ).getSettings()
            if (!settings.requestedEnabled) return Result.success()

            val accessController = NotificationAccessController(applicationContext)
            if (!accessController.isGranted()) return Result.success()
            if (PaymentDetectionListenerRuntime.isConnected()) return Result.success()

            if (accessController.requestRebindIfGranted()) {
                Result.success()
            } else {
                Result.retry()
            }
        } catch (_: RuntimeException) {
            Result.retry()
        }
    }
}

object PaymentListenerRecoveryScheduler {
    private const val PERIODIC_WORK =
        "aura-payment-listener-recovery-periodic-v1"
    private const val IMMEDIATE_WORK =
        "aura-payment-listener-recovery-immediate-v1"

    /**
     * Keeps recovery work aligned with the persisted user choice. Paused,
     * logged-out and purged states do not retain a periodic wakeup.
     */
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
}
