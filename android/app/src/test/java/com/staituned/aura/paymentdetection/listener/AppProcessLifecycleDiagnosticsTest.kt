package com.staituned.aura.paymentdetection.listener

import android.app.ApplicationExitInfo
import org.junit.Assert.assertEquals
import org.junit.Test

class AppProcessLifecycleDiagnosticsTest {
    @Test
    fun processAgeIsBucketedAndNeverExposesRawTimestamps() {
        val unit = 60_000L
        assertEquals("UNAVAILABLE", AppProcessLifecycleDiagnostics.ageBucket(-1))
        assertEquals("UNDER_15_MIN", AppProcessLifecycleDiagnostics.ageBucket(0))
        assertEquals("UNDER_15_MIN", AppProcessLifecycleDiagnostics.ageBucket(15 * unit - 1))
        assertEquals("15_TO_60_MIN", AppProcessLifecycleDiagnostics.ageBucket(15 * unit))
        assertEquals("1_TO_24_H", AppProcessLifecycleDiagnostics.ageBucket(60 * unit))
        assertEquals("1_TO_7_D", AppProcessLifecycleDiagnostics.ageBucket(24 * 60 * unit))
        assertEquals("OVER_7_D", AppProcessLifecycleDiagnostics.ageBucket(7 * 24 * 60 * unit))
    }

    @Test
    fun invalidOrFutureExitTimestampIsUnavailableNotEvidenceOfProcessHealth() {
        assertEquals(
            "UNAVAILABLE",
            AppProcessLifecycleDiagnostics.previousExitAge(1_000L, 0L),
        )
        assertEquals(
            "UNAVAILABLE",
            AppProcessLifecycleDiagnostics.previousExitAge(1_000L, 1_001L),
        )
        assertEquals(
            "UNDER_15_MIN",
            AppProcessLifecycleDiagnostics.previousExitAge(900_000L, 1L),
        )
    }

    @Test
    fun osExitReasonsAreReducedToFixedLabelsWithoutDescriptionsOrStatusCodes() {
        assertEquals(
            "CRASH",
            AppProcessLifecycleDiagnostics.exitReasonLabel(ApplicationExitInfo.REASON_CRASH),
        )
        assertEquals(
            "NATIVE_CRASH",
            AppProcessLifecycleDiagnostics.exitReasonLabel(ApplicationExitInfo.REASON_CRASH_NATIVE),
        )
        assertEquals(
            "ANR",
            AppProcessLifecycleDiagnostics.exitReasonLabel(ApplicationExitInfo.REASON_ANR),
        )
        assertEquals(
            "LOW_MEMORY",
            AppProcessLifecycleDiagnostics.exitReasonLabel(ApplicationExitInfo.REASON_LOW_MEMORY),
        )
        assertEquals(
            "PACKAGE_UPDATED",
            AppProcessLifecycleDiagnostics.exitReasonLabel(ApplicationExitInfo.REASON_PACKAGE_UPDATED),
        )
        assertEquals(
            "PACKAGE_STATE_CHANGE",
            AppProcessLifecycleDiagnostics.exitReasonLabel(ApplicationExitInfo.REASON_PACKAGE_STATE_CHANGE),
        )
        assertEquals(
            "USER_REQUESTED",
            AppProcessLifecycleDiagnostics.exitReasonLabel(ApplicationExitInfo.REASON_USER_REQUESTED),
        )
        assertEquals(
            "OTHER_OR_UNRECOGNIZED",
            AppProcessLifecycleDiagnostics.exitReasonLabel(Int.MAX_VALUE),
        )
    }
}
