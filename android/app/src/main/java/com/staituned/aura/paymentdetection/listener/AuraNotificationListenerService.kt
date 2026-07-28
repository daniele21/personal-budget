package com.staituned.aura.paymentdetection.listener

import android.content.ComponentName
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.staituned.aura.paymentdetection.data.PaymentCandidateRepository
import com.staituned.aura.paymentdetection.data.PaymentDetectionSettingsStore
import com.staituned.aura.paymentdetection.data.SupportedPaymentAppCatalog
import com.staituned.aura.paymentdetection.domain.PaymentDetectionInput
import com.staituned.aura.paymentdetection.domain.PaymentDetectionResult
import com.staituned.aura.paymentdetection.domain.PaymentRuleEngine

class AuraNotificationListenerService : NotificationListenerService() {
    private val ruleEngine = PaymentRuleEngine()
    private val candidateRepository: PaymentCandidateRepository by lazy {
        PaymentCandidateRepository(applicationContext)
    }

    private val gate: PaymentNotificationGate by lazy {
        val settingsStore = PaymentDetectionSettingsStore(applicationContext)
        PaymentNotificationGate(
            isProcessingAllowed = settingsStore::isProcessingAllowed,
            sink = { packageName, envelope ->
                PaymentDetectionListenerRuntime.markEnvelopeAccepted()
                SupportedPaymentAppCatalog.findByPackageName(packageName)?.let { sourceApp ->
                    val result = ruleEngine.evaluate(
                        PaymentDetectionInput(
                            sourceAppId = sourceApp.id,
                            title = envelope.title,
                            text = envelope.text,
                            bigText = envelope.bigText,
                            postedAtEpochMillis = envelope.postedAtEpochMillis,
                        ),
                    )
                    PaymentDetectionListenerRuntime.markDetectionResult(result)
                    if (result is PaymentDetectionResult.Candidate) {
                        val persistenceResult = candidateRepository.persist(
                            candidate = result,
                            notificationKey = envelope.notificationKey,
                        )
                        PaymentDetectionListenerRuntime.markPersistenceResult(
                            persistenceResult,
                        )
                    }
                }
            },
            onFailure = PaymentDetectionListenerRuntime::markPersistenceFailure,
        )
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        PaymentDetectionListenerRuntime.markConnected()
    }

    override fun onListenerDisconnected() {
        PaymentDetectionListenerRuntime.markDisconnected()
        requestRebind(ComponentName(this, AuraNotificationListenerService::class.java))
        super.onListenerDisconnected()
    }

    override fun onNotificationPosted(notification: StatusBarNotification) {
        val packageName = notification.packageName
        gate.onNotificationPosted(packageName) {
            PaymentNotificationEnvelopeReader.read(
                notification = notification.notification,
                postedAtEpochMillis = notification.postTime,
                notificationKey = notification.key,
            )
        }
    }

    override fun onNotificationRemoved(notification: StatusBarNotification) {
        // Removal remains a no-op. A posted payment candidate is a short-lived
        // workflow record and does not mirror notification tray lifetime.
    }

    override fun onDestroy() {
        PaymentDetectionListenerRuntime.markDisconnected()
        gate.close()
        super.onDestroy()
    }
}
