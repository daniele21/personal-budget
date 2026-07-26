package com.staituned.aura.paymentdetection.listener

import android.content.ComponentName
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.staituned.aura.paymentdetection.data.PaymentDetectionSettingsStore

class AuraNotificationListenerService : NotificationListenerService() {
    private val gate: PaymentNotificationGate by lazy {
        val settingsStore = PaymentDetectionSettingsStore(applicationContext)
        PaymentNotificationGate(
            isProcessingAllowed = settingsStore::isProcessingAllowed,
            sink = {
                // Ephemeral count only: no content, log, storage, or bridge DTO.
                PaymentDetectionListenerRuntime.markEnvelopeAccepted()
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
            PaymentNotificationEnvelopeReader.read(notification.notification)
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
