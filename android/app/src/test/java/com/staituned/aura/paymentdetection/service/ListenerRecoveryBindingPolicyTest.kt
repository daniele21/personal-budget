package com.staituned.aura.paymentdetection.service

import com.staituned.aura.paymentdetection.listener.ListenerBindingAction
import com.staituned.aura.paymentdetection.listener.PaymentListenerProbeResult
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ListenerRecoveryBindingPolicyTest {
    @Test
    fun missingEndpointRequestsBindWithoutCycling() {
        assertEquals(
            ListenerBindingAction.REQUEST_BIND,
            listenerBindingActionForProbe(PaymentListenerProbeResult.UNAVAILABLE),
        )
    }

    @Test
    fun registeredButFailedEndpointMayBeCycled() {
        assertEquals(
            ListenerBindingAction.CYCLE_CONNECTED,
            listenerBindingActionForProbe(PaymentListenerProbeResult.FAILED),
        )
    }

    @Test
    fun healthySkippedAndUnavailableSettingsNeverRequestUnbindThroughThisPolicy() {
        listOf(
            PaymentListenerProbeResult.HEALTHY,
            PaymentListenerProbeResult.MISSED_CALLBACK_RECOVERED,
            PaymentListenerProbeResult.SKIPPED_DISABLED,
            PaymentListenerProbeResult.SETTINGS_FAILURE,
        ).forEach { probe ->
            assertNull(listenerBindingActionForProbe(probe))
        }
    }
}
