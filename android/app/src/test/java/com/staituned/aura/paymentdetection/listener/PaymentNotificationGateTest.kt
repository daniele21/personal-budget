package com.staituned.aura.paymentdetection.listener

import java.util.concurrent.Executor
import org.junit.Assert.assertEquals
import org.junit.Test

class PaymentNotificationGateTest {
    private val directExecutor = Executor { it.run() }

    @Test
    fun unsupportedPackageReturnsBeforeExtrasAreRead() {
        var extrasReads = 0
        val gate = PaymentNotificationGate(
            isProcessingAllowed = { false },
            executor = directExecutor,
        )

        gate.onNotificationPosted("com.example.unsupported") {
            extrasReads += 1
            envelope()
        }

        assertEquals(0, extrasReads)
    }

    @Test
    fun supportedButUnselectedPackageReturnsBeforeExtrasAreRead() {
        var extrasReads = 0
        val selected = emptySet<String>()
        val gate = PaymentNotificationGate(
            isProcessingAllowed = { it in selected },
            executor = directExecutor,
        )

        gate.onNotificationPosted("com.staituned.aura.syntheticnotifications") {
            extrasReads += 1
            envelope()
        }

        assertEquals(0, extrasReads)
    }

    @Test
    fun selectedSyntheticPackageReadsExtrasOffTheCallingPathOnce() {
        var extrasReads = 0
        var accepted = 0
        val gate = PaymentNotificationGate(
            isProcessingAllowed = {
                it == "com.staituned.aura.syntheticnotifications"
            },
            executor = directExecutor,
            sink = { packageName, _ ->
                assertEquals("com.staituned.aura.syntheticnotifications", packageName)
                accepted += 1
            },
        )

        gate.onNotificationPosted("com.staituned.aura.syntheticnotifications") {
            extrasReads += 1
            envelope()
        }

        assertEquals(1, extrasReads)
        assertEquals(1, accepted)
    }

    private fun envelope() = PaymentNotificationEnvelope(
        title = "Synthetic",
        text = "Synthetic",
        bigText = null,
        postedAtEpochMillis = 1_754_000_000_000L,
    )
}
