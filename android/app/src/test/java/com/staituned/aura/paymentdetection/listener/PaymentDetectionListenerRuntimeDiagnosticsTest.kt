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
    fun ignoredPaymentReasonsRemainContentFreeAndResetAtOwnerBoundary() {
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
            val snapshot = PaymentDetectionListenerRuntime.diagnosticsSnapshot()
            assertEquals(3, snapshot.ignoredMatches)
            assertEquals(1, snapshot.ignoredNegativeSignals)
            assertEquals(1, snapshot.ignoredNoApprovedPattern)
            assertEquals(1, snapshot.ignoredOtherReasons)
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
    fun recoveryOutcomeDistinguishesNoAccessFromHealthyEmptySnapshot() {
        PaymentDetectionListenerRuntime.resetDiagnostics()
        try {
            PaymentDetectionListenerRuntime.markRecoveryResult("NO_ACCESS")
            var state = PaymentDetectionListenerRuntime.diagnosticsSnapshot()
            assertEquals(1, state.recoveryAttempts)
            assertEquals("NO_ACCESS", state.lastRecoveryResult)
            assertEquals(0, state.activeSnapshotReads)

            PaymentDetectionListenerRuntime.markActiveSnapshotRead(0, 0)
            PaymentDetectionListenerRuntime.markRecoveryResult("RECONCILED")
            state = PaymentDetectionListenerRuntime.diagnosticsSnapshot()
            assertEquals(2, state.recoveryAttempts)
            assertEquals("RECONCILED", state.lastRecoveryResult)
            assertEquals(1, state.activeSnapshotReads)
            assertEquals(0, state.selectedCallbacks)
        } finally {
            PaymentDetectionListenerRuntime.resetDiagnostics()
        }
        val cleared = PaymentDetectionListenerRuntime.diagnosticsSnapshot()
        assertEquals(0, cleared.recoveryAttempts)
        assertEquals("NOT_RUN", cleared.lastRecoveryResult)
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
