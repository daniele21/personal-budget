package com.staituned.aura.paymentdetection.listener

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Own-package, read-only API36 check. Does not manufacture a crash, restart a
 * process, access notifications or mutate listener permissions.
 */
@RunWith(AndroidJUnit4::class)
class AppProcessLifecycleDiagnosticsInstrumentedTest {
    @Test
    fun ownProcessEvidenceIsContentFreeAndDoesNotNeedSpecialPermission() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val evidence = AppProcessLifecycleDiagnostics.read(context)
        val ages = setOf(
            "UNAVAILABLE", "UNDER_15_MIN", "15_TO_60_MIN",
            "1_TO_24_H", "1_TO_7_D", "OVER_7_D",
        )
        val reasons = setOf(
            "UNAVAILABLE", "NO_RECORD", "CRASH", "NATIVE_CRASH", "ANR",
            "LOW_MEMORY", "SIGNALED", "USER_REQUESTED", "PACKAGE_UPDATED",
            "PACKAGE_STATE_CHANGE", "PERMISSION_CHANGE", "EXIT_SELF",
            "DEPENDENCY_DIED", "OTHER_OR_UNRECOGNIZED",
        )
        assertTrue(evidence.currentProcessAge in ages)
        assertTrue(evidence.previousProcessExitAge in ages)
        assertTrue(evidence.previousProcessExitReason in reasons)
        // No raw OS reason descriptions, exception strings, PID, or account
        // identifiers can cross the native bridge via this strict whitelist.
        assertFalse(evidence.previousProcessExitReason.contains(':'))
    }
}
