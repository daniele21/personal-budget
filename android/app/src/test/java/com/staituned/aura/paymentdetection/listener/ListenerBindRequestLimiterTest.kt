package com.staituned.aura.paymentdetection.listener

import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ListenerBindRequestLimiterTest {
    @Test
    fun twentyFiveImmediateRecoveryPollsReserveOnlyOneActualBind() {
        var elapsed = 0L
        val limiter = ListenerBindRequestLimiter { elapsed }
        var submitted = 0
        var deferred = 0

        repeat(25) {
            if (limiter.reserve(PaymentListenerGeneration.CURRENT)) {
                submitted++
            } else {
                deferred++
            }
        }

        assertEquals(1, submitted)
        assertEquals(24, deferred)
        elapsed = 29_999L
        assertFalse(limiter.reserve(PaymentListenerGeneration.CURRENT))
        elapsed = 30_000L
        assertTrue(limiter.reserve(PaymentListenerGeneration.CURRENT))
    }

    @Test
    fun repeatedMissingBindsBackOffWithoutPermanentlyStoppingRecovery() {
        var elapsed = 0L
        val limiter = ListenerBindRequestLimiter { elapsed }
        assertTrue(limiter.reserve(PaymentListenerGeneration.CURRENT))

        // Distances between successive *submitted* bind requests.
        listOf(30_000L, 60_000L, 120_000L, 240_000L, 300_000L, 300_000L)
            .forEach { delay ->
                elapsed += delay - 1L
                assertFalse(limiter.reserve(PaymentListenerGeneration.CURRENT))
                elapsed++
                assertTrue(limiter.reserve(PaymentListenerGeneration.CURRENT))
            }
        assertEquals(300_000L, ListenerBindRequestLimiter.retryDelayAfter(100))
    }

    @Test
    fun generationsAndConnectionResetsCannotBlockEachOther() {
        var elapsed = 7_000L
        val limiter = ListenerBindRequestLimiter { elapsed }
        assertTrue(limiter.reserve(PaymentListenerGeneration.CURRENT))
        assertFalse(limiter.reserve(PaymentListenerGeneration.CURRENT))
        assertTrue(limiter.reserve(PaymentListenerGeneration.LEGACY))
        limiter.clear(PaymentListenerGeneration.CURRENT)
        assertTrue(limiter.reserve(PaymentListenerGeneration.CURRENT))
        assertFalse(limiter.reserve(PaymentListenerGeneration.LEGACY))

        limiter.clearAll() // opt-out / owner boundary
        assertTrue(limiter.reserve(PaymentListenerGeneration.LEGACY))

        // If elapsedRealtime unexpectedly goes backwards, never freeze binds.
        elapsed = 0L
        assertTrue(limiter.reserve(PaymentListenerGeneration.LEGACY))
    }

    @Test
    fun simultaneousRecoveryPollsCannotReserveMultipleBinds() {
        val limiter = ListenerBindRequestLimiter { 12_345L }
        val executor = Executors.newFixedThreadPool(8)
        val start = CountDownLatch(1)
        try {
            val attempts = (1..24).map {
                executor.submit<Boolean> {
                    start.await()
                    limiter.reserve(PaymentListenerGeneration.CURRENT)
                }
            }
            start.countDown()
            assertEquals(1, attempts.count { it.get(5L, TimeUnit.SECONDS) })
        } finally {
            executor.shutdownNow()
        }
    }
}
