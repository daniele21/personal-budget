package com.staituned.aura.paymentdetection.listener

import com.staituned.aura.paymentdetection.service.PaymentListenerRecoveryResult
import com.staituned.aura.paymentdetection.service.listenerBindingActionForProbe
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Content-free simulation of the Galaxy A56 symptom, not an OEM bind emulator.
 *
 * The current production coordinator requests a bind when no endpoint exists.
 * This harness reproduces the observed diagnostics without pretending that a
 * request was acknowledged by the Android notification framework.
 */
class MissingListenerBindingIncidentTest {
    @Test
    fun grantedAndEnabledButTwentyFiveRequestsDoNotInventAServiceOrSnapshot() {
        val os = NotificationListenerSystemEvidence(
            frameworkV2Approved = true,
            v2ComponentEnabled = true,
            backgroundRestricted = false,
        )
        assertEquals(true, os.frameworkV2Approved)
        assertEquals(true, os.v2ComponentEnabled)
        assertEquals(false, os.backgroundRestricted)

        PaymentDetectionListenerRuntime.resetDiagnostics()
        try {
            repeat(25) {
                // No onCreate/onListenerConnected callback is simulated here.
                val probe = PaymentDetectionListenerRuntime.probeAndReconcile(
                    PaymentListenerGeneration.CURRENT,
                )
                assertEquals(PaymentListenerProbeResult.UNAVAILABLE, probe)
                assertEquals(
                    ListenerBindingAction.REQUEST_BIND,
                    listenerBindingActionForProbe(probe),
                )
                // Models the coordinator's submitted bind request. It is not
                // a live OS request or proof that the service started.
                PaymentDetectionListenerRuntime.markRecoveryResult(
                    PaymentListenerRecoveryResult.BIND_REQUESTED.name,
                )
            }

            val snapshot = PaymentDetectionListenerRuntime.diagnosticsSnapshot()
            assertEquals(25, snapshot.recoveryAttempts)
            assertEquals("BIND_REQUESTED", snapshot.lastRecoveryResult)
            assertEquals(0, snapshot.currentListenerServiceStarts)
            assertEquals(0, snapshot.currentListenerConnections)
            assertEquals(0, snapshot.legacyListenerConnections)
            assertEquals(0, snapshot.supportedCallbacksObserved)
            assertEquals(0, snapshot.activeSnapshotReads)
            assertEquals(0, snapshot.activeSnapshotFailures)
            assertFalse(PaymentDetectionListenerRuntime.isConnected(PaymentListenerGeneration.CURRENT))
        } finally {
            PaymentDetectionListenerRuntime.resetDiagnostics()
        }
    }

    @Test
    fun serviceCreationAloneDoesNotClaimConnectionOrSnapshot() {
        PaymentDetectionListenerRuntime.resetDiagnostics()
        try {
            PaymentDetectionListenerRuntime.markServiceCreated(PaymentListenerGeneration.CURRENT)
            val snapshot = PaymentDetectionListenerRuntime.diagnosticsSnapshot()
            assertEquals(1, snapshot.currentListenerServiceStarts)
            assertEquals(0, snapshot.currentListenerConnections)
            assertEquals(0, snapshot.activeSnapshotReads)
            assertEquals(
                PaymentListenerProbeResult.UNAVAILABLE,
                PaymentDetectionListenerRuntime.probeAndReconcile(PaymentListenerGeneration.CURRENT),
            )
            assertTrue(snapshot.currentListenerServiceStarts > snapshot.currentListenerConnections)
        } finally {
            PaymentDetectionListenerRuntime.resetDiagnostics()
        }
    }
}
