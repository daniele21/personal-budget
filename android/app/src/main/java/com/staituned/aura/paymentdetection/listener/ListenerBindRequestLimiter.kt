package com.staituned.aura.paymentdetection.listener

import android.os.SystemClock

/**
 * Process-local, per-generation rate limit for *missing* listener endpoints.
 *
 * NotificationListenerService.requestRebind() returns before Android completes
 * an asynchronous bind. Repeated foreground status reads and WorkManager
 * recovery must not repeatedly request the same unconfirmed binding.
 *
 * No notification/owner content or identifiers are persisted. A process restart,
 * account reset or actual onListenerConnected() callback clears this state.
 */
internal class ListenerBindRequestLimiter(
    private val elapsedRealtime: () -> Long = SystemClock::elapsedRealtime,
) {
    private data class Attempt(
        val atElapsedMs: Long,
        val consecutiveAttempts: Int,
    )

    private val attempts = mutableMapOf<PaymentListenerGeneration, Attempt>()

    /**
     * Atomically reserves an eligible attempt before invoking the Android API,
     * so two concurrent recovery passes cannot both request the same bind.
     */
    @Synchronized
    fun reserve(generation: PaymentListenerGeneration): Boolean {
        val now = elapsedRealtime()
        val previous = attempts[generation]
        if (previous != null && now >= previous.atElapsedMs) {
            val sinceLast = now - previous.atElapsedMs
            if (sinceLast < retryDelayAfter(previous.consecutiveAttempts)) {
                return false
            }
        }
        attempts[generation] = Attempt(
            atElapsedMs = now,
            consecutiveAttempts = minOf(
                (previous?.consecutiveAttempts ?: 0) + 1,
                MAX_TRACKED_ATTEMPTS,
            ),
        )
        return true
    }

    @Synchronized
    fun clear(generation: PaymentListenerGeneration) {
        attempts.remove(generation)
    }

    @Synchronized
    fun clearAll() {
        attempts.clear()
    }

    companion object {
        private const val MAX_TRACKED_ATTEMPTS = 6
        private const val INITIAL_RETRY_DELAY_MS = 30_000L
        private const val MAX_RETRY_DELAY_MS = 300_000L

        /** Bounded backoff; never permanently gives up while opt-in remains on. */
        internal fun retryDelayAfter(consecutiveAttempts: Int): Long {
            val exponent = (consecutiveAttempts - 1).coerceIn(0, 4)
            return minOf(
                INITIAL_RETRY_DELAY_MS * (1L shl exponent),
                MAX_RETRY_DELAY_MS,
            )
        }
    }
}
