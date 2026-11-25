package com.staituned.aura.paymentdetection.listener

import android.app.ActivityManager
import android.app.ApplicationExitInfo
import android.content.Context
import android.os.Process
import android.os.SystemClock

/**
 * Read-only Android process evidence for the currently installed Aura package.
 *
 * OS exit history survives process restart; the listener's in-memory counters
 * do not. Neither a prior process exit nor a long-lived process proves that
 * NotificationManager did or did not bind the notification listener service.
 *
 * Never read ApplicationExitInfo descriptions, traces, PIDs, UID, process state
 * summaries or financial notification data. No persistent telemetry or network.
 */
internal data class AppProcessLifecycleEvidence(
    val currentProcessAge: String,
    val previousProcessExitReason: String,
    val previousProcessExitAge: String,
)

internal object AppProcessLifecycleDiagnostics {
    private const val MAX_OS_EXIT_RECORDS = 8
    private const val MINUTE_MS = 60_000L
    private const val HOUR_MS = 60L * MINUTE_MS
    private const val DAY_MS = 24L * HOUR_MS

    fun read(context: Context): AppProcessLifecycleEvidence {
        val processAge = ageBucket(
            SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime(),
        )
        val lastExit = try {
            val manager = context.getSystemService(ActivityManager::class.java)
            manager?.getHistoricalProcessExitReasons(
                context.packageName,
                0,
                MAX_OS_EXIT_RECORDS,
            )?.firstOrNull { it.processName == context.packageName }
        } catch (_: RuntimeException) {
            return AppProcessLifecycleEvidence(processAge, "UNAVAILABLE", "UNAVAILABLE")
        }

        if (lastExit == null) {
            // A missing record means no record was returned, not no process
            // death (OEMs may trim, omit or coalesce exit history).
            return AppProcessLifecycleEvidence(processAge, "NO_RECORD", "UNAVAILABLE")
        }

        return AppProcessLifecycleEvidence(
            currentProcessAge = processAge,
            previousProcessExitReason = exitReasonLabel(lastExit.reason),
            previousProcessExitAge = previousExitAge(
                nowMillis = System.currentTimeMillis(),
                exitTimestampMillis = lastExit.timestamp,
            ),
        )
    }

    /** Bounded categories only; no raw OS description, UID or signal/status. */
    internal fun exitReasonLabel(reason: Int): String = when (reason) {
        ApplicationExitInfo.REASON_CRASH -> "CRASH"
        ApplicationExitInfo.REASON_CRASH_NATIVE -> "NATIVE_CRASH"
        ApplicationExitInfo.REASON_ANR -> "ANR"
        ApplicationExitInfo.REASON_LOW_MEMORY -> "LOW_MEMORY"
        ApplicationExitInfo.REASON_SIGNALED -> "SIGNALED"
        ApplicationExitInfo.REASON_USER_REQUESTED -> "USER_REQUESTED"
        ApplicationExitInfo.REASON_PACKAGE_UPDATED -> "PACKAGE_UPDATED"
        ApplicationExitInfo.REASON_PACKAGE_STATE_CHANGE -> "PACKAGE_STATE_CHANGE"
        ApplicationExitInfo.REASON_PERMISSION_CHANGE -> "PERMISSION_CHANGE"
        ApplicationExitInfo.REASON_EXIT_SELF -> "EXIT_SELF"
        ApplicationExitInfo.REASON_DEPENDENCY_DIED -> "DEPENDENCY_DIED"
        else -> "OTHER_OR_UNRECOGNIZED"
    }

    internal fun previousExitAge(
        nowMillis: Long,
        exitTimestampMillis: Long,
    ): String =
        if (exitTimestampMillis <= 0L || exitTimestampMillis > nowMillis) {
            "UNAVAILABLE"
        } else {
            ageBucket(nowMillis - exitTimestampMillis)
        }

    /** Age buckets avoid exposing device-specific timestamps across the bridge. */
    internal fun ageBucket(ageMillis: Long): String = when {
        ageMillis < 0L -> "UNAVAILABLE"
        ageMillis < 15L * MINUTE_MS -> "UNDER_15_MIN"
        ageMillis < HOUR_MS -> "15_TO_60_MIN"
        ageMillis < DAY_MS -> "1_TO_24_H"
        ageMillis < 7L * DAY_MS -> "1_TO_7_D"
        else -> "OVER_7_D"
    }
}
