package com.staituned.aura.paymentdetection.listener

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
