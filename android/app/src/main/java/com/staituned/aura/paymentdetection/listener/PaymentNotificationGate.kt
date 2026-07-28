package com.staituned.aura.paymentdetection.listener

import java.util.concurrent.Executor
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * The package and user-selection gates execute before the deferred extractor.
 * Calling code must place every notification-extras access inside `extract`.
 */
internal class PaymentNotificationGate(
    private val isProcessingAllowed: (String) -> Boolean,
    private val executor: Executor = Executors.newSingleThreadExecutor(),
    private val sink: (String, PaymentNotificationEnvelope) -> Unit = { _, _ -> },
) {
    fun onNotificationPosted(
        packageName: String,
        extract: () -> PaymentNotificationEnvelope,
    ) {
        if (!isProcessingAllowed(packageName)) return
        executor.execute {
            sink(packageName, extract())
        }
    }

    fun close() {
        (executor as? ExecutorService)?.shutdownNow()
    }
}
