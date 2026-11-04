package com.staituned.aura.paymentdetection.listener

import org.junit.Assert.assertEquals
import org.junit.Test

class ListenerRepairBindingPolicyTest {
    @Test
    fun manualRepairOfDisconnectedListenerRequestsBindOnly() {
        assertEquals(
            ListenerBindingAction.REQUEST_BIND,
            listenerBindingActionForRepair(connected = false),
        )
    }

    @Test
    fun manualRepairOfConnectedListenerMayCycleBinding() {
        assertEquals(
            ListenerBindingAction.CYCLE_CONNECTED,
            listenerBindingActionForRepair(connected = true),
        )
    }
}
