package com.staituned.aura.paymentdetection.listener

import com.staituned.aura.paymentdetection.data.CandidatePersistenceResult
import com.staituned.aura.paymentdetection.domain.PaymentDetectionResult
import com.staituned.aura.paymentdetection.domain.PaymentMatchTier
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicInteger

enum class PaymentListenerGeneration {
    LEGACY,
    CURRENT,
}

interface PaymentListenerHealthEndpoint {
    /**
     * Verifies that NotificationManager operations still work and replays a
     * bounded active-notification snapshot through the normal privacy gate.
     */
    fun probeAndReconcile(): Boolean
}

internal enum class PaymentListenerProbeResult {
    HEALTHY,
    UNAVAILABLE,
    FAILED,
}

internal object PaymentDetectionListenerRuntime {
    private val endpoints = mutableMapOf<
        PaymentListenerGeneration,
        WeakReference<PaymentListenerHealthEndpoint>,
    >()
    private val legacyConnectionEpoch = AtomicInteger(0)
    private val currentConnectionEpoch = AtomicInteger(0)
    private val suppressedPostedCallbacksForTest = AtomicInteger(0)

    private val acceptedEnvelopes = AtomicInteger(0)
    private val exactMatches = AtomicInteger(0)
    private val reviewMatches = AtomicInteger(0)
    private val ignoredMatches = AtomicInteger(0)
    private val persistedCandidates = AtomicInteger(0)
    private val persistenceFailures = AtomicInteger(0)

    @Synchronized
    fun register(
        generation: PaymentListenerGeneration,
        endpoint: PaymentListenerHealthEndpoint,
    ) {
        endpoints[generation] = WeakReference(endpoint)
        connectionCounter(generation).incrementAndGet()
    }

    @Synchronized
    fun unregister(
        generation: PaymentListenerGeneration,
        endpoint: PaymentListenerHealthEndpoint,
    ) {
        val registered = endpoints[generation]?.get()
        if (registered == null || registered === endpoint) {
            endpoints.remove(generation)
        }
    }

    @Synchronized
    fun isConnected(generation: PaymentListenerGeneration): Boolean {
        val endpoint = endpoints[generation]?.get()
        if (endpoint == null) {
            endpoints.remove(generation)
            return false
        }
        return true
    }

    fun isConnected(): Boolean =
        isConnected(PaymentListenerGeneration.CURRENT) ||
            isConnected(PaymentListenerGeneration.LEGACY)

    fun connectionEpoch(generation: PaymentListenerGeneration): Int =
        connectionCounter(generation).get()

    fun probeAndReconcile(
        generation: PaymentListenerGeneration,
    ): PaymentListenerProbeResult {
        val endpoint = synchronized(this) {
            endpoints[generation]?.get().also {
                if (it == null) endpoints.remove(generation)
            }
        } ?: return PaymentListenerProbeResult.UNAVAILABLE

        return try {
            if (endpoint.probeAndReconcile()) {
                PaymentListenerProbeResult.HEALTHY
            } else {
                PaymentListenerProbeResult.FAILED
            }
        } catch (_: RuntimeException) {
            PaymentListenerProbeResult.FAILED
        }
    }

    /**
     * Instrumentation can emulate the real-device failure mode where the
     * listener remains connected but one posted callback is never delivered.
     * This hook is internal, has no bridge/intent surface, and is unused by
     * production code; release shrinking removes it when unreachable.
     */
    fun suppressNextPostedCallbackForTest() {
        suppressedPostedCallbacksForTest.incrementAndGet()
    }

    fun consumeSuppressedPostedCallbackForTest(): Boolean {
        while (true) {
            val current = suppressedPostedCallbacksForTest.get()
            if (current <= 0) return false
            if (
                suppressedPostedCallbacksForTest.compareAndSet(
                    current,
                    current - 1,
                )
            ) {
                return true
            }
        }
    }

    fun acceptedEnvelopeCount(): Int = acceptedEnvelopes.get()

    fun markEnvelopeAccepted() {
        acceptedEnvelopes.incrementAndGet()
    }

    fun detectedCount(tier: PaymentMatchTier): Int =
        when (tier) {
            PaymentMatchTier.EXACT -> exactMatches.get()
            PaymentMatchTier.REVIEW -> reviewMatches.get()
            PaymentMatchTier.IGNORED -> ignoredMatches.get()
        }

    fun markDetectionResult(result: PaymentDetectionResult) {
        when (result.tier) {
            PaymentMatchTier.EXACT -> exactMatches.incrementAndGet()
            PaymentMatchTier.REVIEW -> reviewMatches.incrementAndGet()
            PaymentMatchTier.IGNORED -> ignoredMatches.incrementAndGet()
        }
    }

    fun markPersistenceResult(result: CandidatePersistenceResult) {
        if (result is CandidatePersistenceResult.Created) {
            persistedCandidates.incrementAndGet()
        }
    }

    fun persistedCandidateCount(): Int = persistedCandidates.get()

    fun markPersistenceFailure() {
        persistenceFailures.incrementAndGet()
    }

    fun persistenceFailureCount(): Int = persistenceFailures.get()

    fun resetAcceptedEnvelopeCount() {
        acceptedEnvelopes.set(0)
        exactMatches.set(0)
        reviewMatches.set(0)
        ignoredMatches.set(0)
        persistedCandidates.set(0)
        persistenceFailures.set(0)
        suppressedPostedCallbacksForTest.set(0)
    }

    private fun connectionCounter(
        generation: PaymentListenerGeneration,
    ): AtomicInteger =
        when (generation) {
            PaymentListenerGeneration.LEGACY -> legacyConnectionEpoch
            PaymentListenerGeneration.CURRENT -> currentConnectionEpoch
        }
}
