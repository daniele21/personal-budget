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

enum class PaymentListenerEndpointProbeResult {
    HEALTHY,
    MISSED_CALLBACK_RECOVERED,
    FAILED,
}

interface PaymentListenerHealthEndpoint {
    /**
     * Verifies that NotificationManager operations still work and replays a
     * bounded active-notification snapshot through the normal privacy gate.
     */
    fun probeAndReconcile(): PaymentListenerEndpointProbeResult
    fun armHealthHeartbeat()
    fun retireBinding()
}

internal enum class PaymentListenerProbeResult {
    HEALTHY,
    MISSED_CALLBACK_RECOVERED,
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
    private val connectionStartedAt = mutableMapOf<PaymentListenerGeneration, Long>()
    private val latestSelectedCallbackPostTime =
        mutableMapOf<PaymentListenerGeneration, Long>()
    private val processedNotificationVersions =
        mutableMapOf<PaymentListenerGeneration, LinkedHashMap<String, Long>>()
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
        connectionStartedAt[generation] = System.currentTimeMillis()
        latestSelectedCallbackPostTime[generation] = 0L
        processedNotificationVersions[generation] = linkedMapOf()
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
            connectionStartedAt.remove(generation)
            latestSelectedCallbackPostTime.remove(generation)
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

    fun armHealthHeartbeat(generation: PaymentListenerGeneration) {
        val endpoint = synchronized(this) {
            endpoints[generation]?.get().also {
                if (it == null) endpoints.remove(generation)
            }
        } ?: return
        endpoint.armHealthHeartbeat()
    }

    fun retireBinding(generation: PaymentListenerGeneration) {
        val endpoint = synchronized(this) {
            endpoints[generation]?.get().also {
                if (it == null) endpoints.remove(generation)
            }
        } ?: return
        endpoint.retireBinding()
    }

    fun probeAndReconcile(
        generation: PaymentListenerGeneration,
    ): PaymentListenerProbeResult {
        val endpoint = synchronized(this) {
            endpoints[generation]?.get().also {
                if (it == null) endpoints.remove(generation)
            }
        } ?: return PaymentListenerProbeResult.UNAVAILABLE

        return try {
            when (endpoint.probeAndReconcile()) {
                PaymentListenerEndpointProbeResult.HEALTHY ->
                    PaymentListenerProbeResult.HEALTHY
                PaymentListenerEndpointProbeResult.MISSED_CALLBACK_RECOVERED ->
                    PaymentListenerProbeResult.MISSED_CALLBACK_RECOVERED
                PaymentListenerEndpointProbeResult.FAILED ->
                    PaymentListenerProbeResult.FAILED
            }
        } catch (_: RuntimeException) {
            PaymentListenerProbeResult.FAILED
        }
    }

    @Synchronized
    fun markSelectedPostedCallback(
        generation: PaymentListenerGeneration,
        postedAtEpochMillis: Long,
    ) {
        val current = latestSelectedCallbackPostTime[generation] ?: 0L
        if (postedAtEpochMillis > current) {
            latestSelectedCallbackPostTime[generation] = postedAtEpochMillis
        }
    }

    @Synchronized
    fun hasEvidenceOfMissedSelectedCallback(
        generation: PaymentListenerGeneration,
        newestActivePostTime: Long,
    ): Boolean {
        val connectedAt = connectionStartedAt[generation] ?: return false
        val latestCallback = latestSelectedCallbackPostTime[generation] ?: 0L
        return newestActivePostTime > connectedAt &&
            newestActivePostTime > latestCallback
    }

    @Synchronized
    fun wasNotificationProcessed(
        generation: PaymentListenerGeneration,
        notificationKey: String,
        postedAtEpochMillis: Long,
    ): Boolean =
        (processedNotificationVersions[generation]?.get(notificationKey) ?: Long.MIN_VALUE) >=
            postedAtEpochMillis

    @Synchronized
    fun markNotificationProcessed(
        generation: PaymentListenerGeneration,
        notificationKey: String,
        postedAtEpochMillis: Long,
    ) {
        val versions = processedNotificationVersions.getOrPut(generation) {
            linkedMapOf()
        }
        val previous = versions.remove(notificationKey) ?: Long.MIN_VALUE
        versions[notificationKey] = maxOf(previous, postedAtEpochMillis)
        while (versions.size > MAX_TRACKED_NOTIFICATION_KEYS) {
            val oldest = versions.keys.firstOrNull() ?: break
            versions.remove(oldest)
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

    private const val MAX_TRACKED_NOTIFICATION_KEYS = 512

    private fun connectionCounter(
        generation: PaymentListenerGeneration,
    ): AtomicInteger =
        when (generation) {
            PaymentListenerGeneration.LEGACY -> legacyConnectionEpoch
            PaymentListenerGeneration.CURRENT -> currentConnectionEpoch
        }
}
