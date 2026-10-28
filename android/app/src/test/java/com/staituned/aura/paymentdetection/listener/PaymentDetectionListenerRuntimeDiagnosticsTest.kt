package com.staituned.aura.paymentdetection.listener

import com.staituned.aura.paymentdetection.domain.PaymentDetectionResult
import com.staituned.aura.paymentdetection.domain.PaymentIgnoredReason
import org.junit.Assert.assertEquals
import org.junit.Test

class PaymentDetectionListenerRuntimeDiagnosticsTest {
    @Test
    fun supportedAppBeforeGateAndSnapshotCountersDoNotImplyPaymentProcessing() {
        PaymentDetectionListenerRuntime.resetDiagnostics()
        try {
            PaymentDetectionListenerRuntime.markSupportedCallbackObserved()
            PaymentDetectionListenerRuntime.markCallbackRejectedWrongGeneration()
            PaymentDetectionListenerRuntime.markSupportedCallbackObserved()
            PaymentDetectionListenerRuntime.markCallbackRejectedBySettings()
            PaymentDetectionListenerRuntime.markActiveSnapshotRead(
                supportedCount = 2,
                selectedCount = 1,
            )
            PaymentDetectionListenerRuntime.markActiveSnapshotFailure()

            val snapshot = PaymentDetectionListenerRuntime.diagnosticsSnapshot()
            assertEquals(2, snapshot.supportedCallbacksObserved)
            assertEquals(1, snapshot.callbacksRejectedWrongGeneration)
            assertEquals(1, snapshot.callbacksRejectedBySettings)
            assertEquals(1, snapshot.activeSnapshotReads)
            assertEquals(1, snapshot.activeSnapshotFailures)
            assertEquals(2, snapshot.activeSupportedNotifications)
            assertEquals(1, snapshot.activeSelectedNotifications)
            assertEquals(0, snapshot.selectedCallbacks)
            assertEquals(0, snapshot.processedEnvelopes)
            assertEquals(0, snapshot.createdCandidates)
        } finally {
            PaymentDetectionListenerRuntime.resetDiagnostics()
        }
    }

    @Test
    fun recoveryOutcomeDoesNotInventSuccessfulSnapshotReads() {
        PaymentDetectionListenerRuntime.resetDiagnostics()
        try {
            PaymentDetectionListenerRuntime.markRecoveryResult("SETTINGS_FAILURE")
            var snapshot = PaymentDetectionListenerRuntime.diagnosticsSnapshot()
            assertEquals(1, snapshot.recoveryAttempts)
            assertEquals("SETTINGS_FAILURE", snapshot.lastRecoveryResult)
            assertEquals(0, snapshot.activeSnapshotReads)

            PaymentDetectionListenerRuntime.markRecoveryResult("DISABLED")
            snapshot = PaymentDetectionListenerRuntime.diagnosticsSnapshot()
            assertEquals(2, snapshot.recoveryAttempts)
            assertEquals("DISABLED", snapshot.lastRecoveryResult)
            assertEquals(0, snapshot.activeSnapshotReads)

            PaymentDetectionListenerRuntime.markActiveSnapshotRead(0, 0)
            PaymentDetectionListenerRuntime.markRecoveryResult("RECONCILED")
            snapshot = PaymentDetectionListenerRuntime.diagnosticsSnapshot()
            assertEquals(3, snapshot.recoveryAttempts)
            assertEquals("RECONCILED", snapshot.lastRecoveryResult)
            assertEquals(1, snapshot.activeSnapshotReads)
        } finally {
            PaymentDetectionListenerRuntime.resetDiagnostics()
        }
        val reset = PaymentDetectionListenerRuntime.diagnosticsSnapshot()
        assertEquals(0, reset.recoveryAttempts)
        assertEquals("NOT_RUN", reset.lastRecoveryResult)
    }

    @Test
    fun ignoredParserReasonCountersNeverContainContentAndReset() {
        PaymentDetectionListenerRuntime.resetDiagnostics()
        try {
            listOf(
                PaymentIgnoredReason.NEGATIVE_SIGNAL,
                PaymentIgnoredReason.NO_APPROVED_PATTERN,
                PaymentIgnoredReason.MISSING_AMOUNT,
            ).forEach { reason ->
                PaymentDetectionListenerRuntime.markDetectionResult(
                    PaymentDetectionResult.Ignored(reason),
                )
            }
            val state = PaymentDetectionListenerRuntime.diagnosticsSnapshot()
            assertEquals(3, state.ignoredMatches)
            assertEquals(1, state.ignoredNegativeSignals)
            assertEquals(1, state.ignoredNoApprovedPattern)
            assertEquals(1, state.ignoredOtherReasons)
        } finally {
            PaymentDetectionListenerRuntime.resetDiagnostics()
        }
        val cleared = PaymentDetectionListenerRuntime.diagnosticsSnapshot()
        assertEquals(0, cleared.ignoredMatches)
        assertEquals(0, cleared.ignoredNegativeSignals)
        assertEquals(0, cleared.ignoredNoApprovedPattern)
        assertEquals(0, cleared.ignoredOtherReasons)
    }

    @Test
    fun nativeOwnerResetClearsAllPreGateCounters() {
        PaymentDetectionListenerRuntime.markSupportedCallbackObserved()
        PaymentDetectionListenerRuntime.markActiveSnapshotRead(1, 1)
        PaymentDetectionListenerRuntime.resetDiagnostics()
        val snapshot = PaymentDetectionListenerRuntime.diagnosticsSnapshot()
        assertEquals(0, snapshot.supportedCallbacksObserved)
        assertEquals(0, snapshot.activeSnapshotReads)
        assertEquals(0, snapshot.activeSupportedNotifications)
        assertEquals(0, snapshot.activeSelectedNotifications)
    }
}
