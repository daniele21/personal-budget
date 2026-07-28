package com.staituned.aura.paymentdetection.listener

import com.staituned.aura.paymentdetection.data.CandidatePersistenceResult
import com.staituned.aura.paymentdetection.domain.PaymentDetectionResult
import com.staituned.aura.paymentdetection.domain.PaymentMatchTier
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

internal object PaymentDetectionListenerRuntime {
    private val connected = AtomicBoolean(false)
    private val acceptedEnvelopes = AtomicInteger(0)
    private val exactMatches = AtomicInteger(0)
    private val reviewMatches = AtomicInteger(0)
    private val ignoredMatches = AtomicInteger(0)
    private val persistedCandidates = AtomicInteger(0)
    private val persistenceFailures = AtomicInteger(0)

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
    }
}
