package com.staituned.aura.paymentdetection.listener

import android.content.ComponentName
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.staituned.aura.paymentdetection.data.CandidatePersistenceResult
import com.staituned.aura.paymentdetection.data.PaymentCandidateRepository
import com.staituned.aura.paymentdetection.data.PaymentDetectionSettingsStore
import com.staituned.aura.paymentdetection.data.SupportedPaymentAppCatalog
import com.staituned.aura.paymentdetection.domain.PaymentDetectionInput
import com.staituned.aura.paymentdetection.domain.PaymentDetectionResult
import com.staituned.aura.paymentdetection.domain.PaymentMatchTier
import com.staituned.aura.paymentdetection.domain.PaymentRuleEngine
import com.staituned.aura.paymentdetection.events.PaymentCandidateChange
import com.staituned.aura.paymentdetection.events.PaymentCandidateChangeReason
import com.staituned.aura.paymentdetection.events.PaymentCandidateEventBus
import com.staituned.aura.paymentdetection.notification.PaymentCandidateNotifier

class AuraNotificationListenerService : NotificationListenerService() {
    private val ruleEngine = PaymentRuleEngine()
    private val settingsStore: PaymentDetectionSettingsStore by lazy {
        PaymentDetectionSettingsStore(applicationContext)
    }
    private val candidateRepository: PaymentCandidateRepository by lazy {
        PaymentCandidateRepository(applicationContext)
    }
    private val candidateNotifier: PaymentCandidateNotifier by lazy {
        PaymentCandidateNotifier(applicationContext)
    }

    private val gate: PaymentNotificationGate by lazy {
        PaymentNotificationGate(
            isProcessingAllowed = settingsStore::isProcessingAllowed,
            sink = ::processEnvelope,
            onFailure = PaymentDetectionListenerRuntime::markPersistenceFailure,
        )
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        migrateNotificationFilter(
            FLAG_FILTER_TYPE_CONVERSATIONS or
                FLAG_FILTER_TYPE_ALERTING or
                FLAG_FILTER_TYPE_SILENT or
                FLAG_FILTER_TYPE_ONGOING,
            emptyList(),
        )
        PaymentDetectionListenerRuntime.markConnected()
        reconcileActiveNotifications()
    }

    override fun onListenerDisconnected() {
        PaymentDetectionListenerRuntime.markDisconnected()
        requestRebind(ComponentName(this, AuraNotificationListenerService::class.java))
        super.onListenerDisconnected()
    }

    override fun onNotificationPosted(notification: StatusBarNotification) {
        enqueueNotification(notification)
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

    private fun enqueueNotification(notification: StatusBarNotification) {
        val packageName = notification.packageName
        gate.onNotificationPosted(packageName) {
            PaymentNotificationEnvelopeReader.read(
                notification = notification.notification,
                postedAtEpochMillis = notification.postTime,
                notificationKey = notification.key,
            )
        }
    }

    private fun processEnvelope(
        packageName: String,
        envelope: PaymentNotificationEnvelope,
    ) {
        PaymentDetectionListenerRuntime.markEnvelopeAccepted()
        val sourceApp = SupportedPaymentAppCatalog.findByPackageName(packageName)
            ?: return
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
            when (persistenceResult) {
                is CandidatePersistenceResult.Created -> {
                    PaymentCandidateEventBus.publish(
                        PaymentCandidateChange(
                            PaymentCandidateChangeReason.CREATED,
                            persistenceResult.candidateId,
                        ),
                    )
                    if (result.tier == PaymentMatchTier.EXACT) {
                        candidateNotifier.notifyCandidate(
                            persistenceResult.candidateId,
                        )
                    }
                }
                is CandidatePersistenceResult.Updated -> {
                    PaymentCandidateEventBus.publish(
                        PaymentCandidateChange(
                            PaymentCandidateChangeReason.UPDATED,
                            persistenceResult.candidateId,
                        ),
                    )
                }
                is CandidatePersistenceResult.Duplicate -> Unit
            }
        }

        // Advance only after the selected notification completed the full
        // deterministic processing path without throwing.
        settingsStore.markNotificationObserved(envelope.postedAtEpochMillis)
    }

    /**
     * Replays only active, selected notifications posted after Aura's last
     * safe observation point. This closes the gap where Android/OEM drops the
     * listener process and a payment arrives before the eventual rebind.
     *
     * Extras are still read only inside PaymentNotificationGate after the
     * existing package/user-selection checks. Technical fingerprints make
     * replay idempotent for notifications already processed before a blackout.
     */
    private fun reconcileActiveNotifications() {
        val baseline = try {
            settingsStore.recoveryBaselineAt()
        } catch (_: RuntimeException) {
            null
        } ?: return

        val now = System.currentTimeMillis()
        val floor = maxOf(baseline, now - MAX_RECOVERY_LOOKBACK_MS)
        val notifications = try {
            activeNotifications.toList()
        } catch (_: RuntimeException) {
            return
        }

        notifications.asSequence()
            .filter { it.postTime in floor..(now + MAX_CLOCK_SKEW_MS) }
            .sortedBy { it.postTime }
            .take(MAX_RECOVERY_NOTIFICATIONS)
            .forEach(::enqueueNotification)
    }

    companion object {
        // Matches the existing pending-candidate retention horizon while
        // preventing an upgrade/rebind from examining unbounded old tray data.
        private const val MAX_RECOVERY_LOOKBACK_MS = 14L * 24L * 60L * 60L * 1000L
        private const val MAX_CLOCK_SKEW_MS = 5L * 60L * 1000L
        private const val MAX_RECOVERY_NOTIFICATIONS = 128
    }
}
