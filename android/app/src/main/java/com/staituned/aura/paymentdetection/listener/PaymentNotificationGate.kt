package com.staituned.aura.paymentdetection.listener

import java.util.concurrent.Executor
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException

/**
 * The package and user-selection gates execute before the deferred extractor.
 * Calling code must place every notification-extras access inside `extract`.
 */
internal class PaymentNotificationGate(
    private val isProcessingAllowed: (String) -> Boolean,
    private val executor: Executor = Executors.newSingleThreadExecutor(),
    private val sink: (String, PaymentNotificationEnvelope) -> Unit = { _, _ -> },
    private val onFailure: () -> Unit = {},
) {
    fun onNotificationPosted(
        packageName: String,
        extract: () -> PaymentNotificationEnvelope,
    ) {
        if (!isProcessingAllowed(packageName)) return
        try {
            executor.execute {
                try {
                    sink(packageName, extract())
                } catch (_: RuntimeException) {
                    onFailure()
                }
            }
        } catch (_: RejectedExecutionException) {
            // A system rebind can race one final callback with service teardown.
            // New work is intentionally ignored after close; already accepted
            // work continues through the graceful executor shutdown.
        }
    }

    fun close() {
        // Do not discard callbacks that already passed the package/user gate.
        // A listener health repair may destroy the old service immediately
        // after reconciliation enqueues work; graceful shutdown lets those
        // bounded tasks finish while rejecting new work.
        (executor as? ExecutorService)?.shutdown()
    }
}
