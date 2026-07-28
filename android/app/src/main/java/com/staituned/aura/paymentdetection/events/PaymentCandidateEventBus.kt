package com.staituned.aura.paymentdetection.events

import java.util.concurrent.CopyOnWriteArraySet

internal enum class PaymentCandidateChangeReason(val bridgeValue: String) {
    CREATED("created"),
    UPDATED("updated"),
    IGNORED("ignored"),
    DELETED("deleted"),
}

internal data class PaymentCandidateChange(
    val reason: PaymentCandidateChangeReason,
    val candidateId: String?,
)

internal object PaymentCandidateEventBus {
    private val listeners =
        CopyOnWriteArraySet<(PaymentCandidateChange) -> Unit>()

    fun addListener(listener: (PaymentCandidateChange) -> Unit) {
        listeners += listener
    }

    fun removeListener(listener: (PaymentCandidateChange) -> Unit) {
        listeners -= listener
    }

    fun publish(change: PaymentCandidateChange) {
        listeners.forEach { listener ->
            runCatching { listener(change) }
        }
    }
}
