package com.staituned.aura.paymentdetection.listener

import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

internal object PaymentDetectionListenerRuntime {
    private val connected = AtomicBoolean(false)
    private val acceptedEnvelopes = AtomicInteger(0)

    fun isConnected(): Boolean = connected.get()

    fun markConnected() {
        connected.set(true)
    }

    fun markDisconnected() {
        connected.set(false)
    }

    fun acceptedEnvelopeCount(): Int = acceptedEnvelopes.get()

    fun markEnvelopeAccepted() {
        acceptedEnvelopes.incrementAndGet()
    }

    fun resetAcceptedEnvelopeCount() {
        acceptedEnvelopes.set(0)
    }
}
