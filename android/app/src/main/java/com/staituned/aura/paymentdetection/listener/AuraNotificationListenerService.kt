package com.staituned.aura.paymentdetection.listener

import android.content.ComponentName
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.staituned.aura.paymentdetection.data.PaymentDetectionSettingsStore
import com.staituned.aura.paymentdetection.data.SupportedPaymentAppCatalog
import com.staituned.aura.paymentdetection.domain.PaymentDetectionInput
import com.staituned.aura.paymentdetection.domain.PaymentRuleEngine

class AuraNotificationListenerService : NotificationListenerService() {
    private val ruleEngine = PaymentRuleEngine()

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
                    // M5 retains only ephemeral, redacted counters. M6 will persist
                    // the structured candidate; raw strings remain local variables.
                    PaymentDetectionListenerRuntime.markDetectionResult(result)
                }
            },
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
            )
        }
    }

    override fun onNotificationRemoved(notification: StatusBarNotification) {
        // M4 has no candidate repository. Removal is intentionally a no-op;
        // future M6 reconciliation must remain behind the same owner boundary.
    }

    override fun onDestroy() {
        PaymentDetectionListenerRuntime.markDisconnected()
        gate.close()
        super.onDestroy()
    }
}
