package com.staituned.aura.paymentdetection.service

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.staituned.aura.paymentdetection.data.PaymentCandidateRepository
import com.staituned.aura.paymentdetection.data.PaymentDetectionPrivacyStore
import java.util.concurrent.TimeUnit

class CandidateCleanupWorker(
    appContext: Context,
    workerParameters: WorkerParameters,
) : Worker(appContext, workerParameters) {
    override fun doWork(): Result {
        val privacyStore = PaymentDetectionPrivacyStore(applicationContext)
        if (!privacyStore.hasActiveOwner()) return Result.success()
        return try {
            PaymentCandidateRepository(
                context = applicationContext,
                privacyStore = privacyStore,
            ).cleanup()
            Result.success()
        } catch (_: RuntimeException) {
            // Fail closed. WorkManager records only the failed job state; no
            // candidate data or exception message is emitted.
            Result.failure()
        }
    }
}

object CandidateCleanupScheduler {
    private const val PERIODIC_WORK = "aura-payment-candidate-cleanup-periodic-v1"
    private const val STARTUP_WORK = "aura-payment-candidate-cleanup-startup-v1"

    @JvmStatic
    fun schedule(context: Context) {
        val work = PeriodicWorkRequestBuilder<CandidateCleanupWorker>(
            24,
            TimeUnit.HOURS,
        ).build()
        WorkManager.getInstance(context.applicationContext).enqueueUniquePeriodicWork(
            PERIODIC_WORK,
            ExistingPeriodicWorkPolicy.KEEP,
            work,
        )
    }

    @JvmStatic
    fun runSoon(context: Context) {
        val work = OneTimeWorkRequestBuilder<CandidateCleanupWorker>().build()
        WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
            STARTUP_WORK,
            ExistingWorkPolicy.REPLACE,
            work,
        )
    }
}
