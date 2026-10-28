package com.staituned.aura.paymentdetection.listener

import android.content.ComponentName
import android.os.Handler
import android.os.Looper
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.staituned.aura.paymentdetection.data.CandidatePersistenceResult
import com.staituned.aura.paymentdetection.data.PaymentCandidateRepository
import com.staituned.aura.paymentdetection.data.PaymentDetectionSettingsStore
import com.staituned.aura.paymentdetection.data.SupportedPaymentAppCatalog
import com.staituned.aura.paymentdetection.domain.PaymentDetectionInput
import com.staituned.aura.paymentdetection.domain.PaymentDetectionResult
import com.staituned.aura.paymentdetection.domain.PaymentRuleEngine
import com.staituned.aura.paymentdetection.events.PaymentCandidateChange
import com.staituned.aura.paymentdetection.events.PaymentCandidateChangeReason
import com.staituned.aura.paymentdetection.events.PaymentCandidateEventBus
import com.staituned.aura.paymentdetection.notification.PaymentCandidateNotifier
import com.staituned.aura.paymentdetection.service.PaymentListenerRecoveryCoordinator
import com.staituned.aura.paymentdetection.service.PaymentListenerRecoveryResult
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

abstract class BaseAuraNotificationListenerService :
    NotificationListenerService(),
    PaymentListenerHealthEndpoint {
    protected abstract val generation: PaymentListenerGeneration

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
    private val accessController: NotificationAccessController by lazy {
        NotificationAccessController(applicationContext)
    }
    private val mainHandler: Handler by lazy {
        Handler(Looper.getMainLooper())
    }
    private val gateDelegate = lazy {
        PaymentNotificationGate(
            isProcessingAllowed = settingsStore::isProcessingAllowed,
            sink = ::processEnvelope,
            onFailure = PaymentDetectionListenerRuntime::markPersistenceFailure,
        )
    }
    private val gate by gateDelegate

    private val healthHeartbeat = object : Runnable {
        override fun run() {
            if (!isEffectiveListener()) return
            val result =
                PaymentListenerRecoveryCoordinator(applicationContext).recoverNow()
            when (result) {
                PaymentListenerRecoveryResult.REBIND_REQUESTED,
                PaymentListenerRecoveryResult.RECONCILED_AND_REBIND_REQUESTED,
                PaymentListenerRecoveryResult.NO_ACCESS,
                PaymentListenerRecoveryResult.DISABLED,
                PaymentListenerRecoveryResult.FAILED -> Unit
                PaymentListenerRecoveryResult.RECONCILED ->
                    mainHandler.postDelayed(this, HEALTH_HEARTBEAT_INTERVAL_MS)
            }
        }
    }

    /**
     * Android can report a listener live before its active-notification snapshot
     * is fully populated. Reconcile again at a few bounded settling points so a
     * payment posted during the preceding blackout is not lost to that bind race.
     *
     * This remains process-local, acquires no wake lock, and uses the same
     * selected-package gate plus technical fingerprint idempotency as every
     * other recovery path.
     */
    private val reconnectSettleReconciliation = Runnable {
        if (isEffectiveListener()) {
            reconcileActiveNotifications()
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()

        // Existing installs may still have the original component granted. It
        // remains a fallback only until the V2 component is granted. Once V2
        // owns the effective grant, keep the legacy component unbound so two
        // listeners cannot race the same callback path.
        if (
            generation == PaymentListenerGeneration.LEGACY &&
            accessController.state().currentGrantObservedBefore
        ) {
            accessController.retireLegacyComponentIfCurrentOwned()
            requestUnbind()
            return
        }

        if (generation == PaymentListenerGeneration.LEGACY) {
            // Best-effort only. Android can ignore this for already-migrated
            // legacy filters; V2 uses a new component with manifest defaults.
            migrateNotificationFilter(
                FLAG_FILTER_TYPE_CONVERSATIONS or
                    FLAG_FILTER_TYPE_ALERTING or
                    FLAG_FILTER_TYPE_SILENT or
                    FLAG_FILTER_TYPE_ONGOING,
                emptyList(),
            )
        }

        PaymentDetectionListenerRuntime.register(generation, this)
        if (generation == PaymentListenerGeneration.CURRENT) {
            PaymentDetectionListenerRuntime.retireBinding(
                PaymentListenerGeneration.LEGACY,
            )
            accessController.retireLegacyComponentIfCurrentOwned()
        }
        reconcileActiveNotifications()
        scheduleReconnectSettleReconciliations()
        armHealthHeartbeat()
    }

    override fun onListenerDisconnected() {
        mainHandler.removeCallbacks(healthHeartbeat)
        mainHandler.removeCallbacks(reconnectSettleReconciliation)
        PaymentDetectionListenerRuntime.unregister(generation, this)
        if (accessController.effectiveGeneration() == generation) {
            requestRebind(ComponentName(this, javaClass))
        }
        super.onListenerDisconnected()
    }

    override fun onNotificationPosted(notification: StatusBarNotification) {
        // Observe only the allowlisted package name, before selection and
        // generation checks. Never read the body of a rejected notification.
        val supportedSource =
            SupportedPaymentAppCatalog.findByPackageName(notification.packageName) != null
        if (supportedSource) {
            PaymentDetectionListenerRuntime.markSupportedCallbackObserved()
        }
        if (!isEffectiveListener()) {
            if (supportedSource) {
                PaymentDetectionListenerRuntime.markCallbackRejectedWrongGeneration()
            }
            return
        }
        if (!settingsStore.isProcessingAllowed(notification.packageName)) {
            if (supportedSource) {
                PaymentDetectionListenerRuntime.markCallbackRejectedBySettings()
            }
            return
        }
        if (PaymentDetectionListenerRuntime.consumeSuppressedPostedCallbackForTest()) {
            return
        }
        PaymentDetectionListenerRuntime.markSelectedPostedCallback(
            generation,
            notification.postTime,
        )
        enqueueNotification(notification)
    }

    override fun onNotificationRemoved(notification: StatusBarNotification) {
        // Removal remains a no-op. A posted payment candidate is a short-lived
        // workflow record and does not mirror notification tray lifetime.
    }

    override fun onDestroy() {
        mainHandler.removeCallbacks(healthHeartbeat)
        mainHandler.removeCallbacks(reconnectSettleReconciliation)
        PaymentDetectionListenerRuntime.unregister(generation, this)
        if (gateDelegate.isInitialized()) {
            gate.close()
        }
        super.onDestroy()
    }

    override fun armHealthHeartbeat() {
        mainHandler.removeCallbacks(healthHeartbeat)
        mainHandler.postDelayed(healthHeartbeat, HEALTH_HEARTBEAT_INTERVAL_MS)
    }

    private fun scheduleReconnectSettleReconciliations() {
        mainHandler.removeCallbacks(reconnectSettleReconciliation)
        RECONNECT_SETTLE_DELAYS_MS.forEach { delayMillis ->
            mainHandler.postDelayed(
                reconnectSettleReconciliation,
                delayMillis,
            )
        }
    }

    override fun retireBinding() {
        val retire = Runnable {
            mainHandler.removeCallbacks(healthHeartbeat)
            mainHandler.removeCallbacks(reconnectSettleReconciliation)
            PaymentDetectionListenerRuntime.unregister(generation, this)
            requestUnbind()
        }
        if (Looper.myLooper() == Looper.getMainLooper()) {
            retire.run()
        } else {
            mainHandler.post(retire)
        }
    }

    /**
     * Worker/status refreshes call this even while Android still reports the
     * listener as connected. A successful active-notification snapshot proves
     * the listener can still talk to NotificationManager and also recovers any
     * callback that the OS/OEM failed to deliver.
     */
    override fun probeAndReconcile(): PaymentListenerEndpointProbeResult {
        if (!isEffectiveListener()) {
            return PaymentListenerEndpointProbeResult.FAILED
        }
        if (Looper.myLooper() == Looper.getMainLooper()) {
            return reconcileActiveNotifications()
        }

        val completed = CountDownLatch(1)
        val result = AtomicReference(
            PaymentListenerEndpointProbeResult.FAILED,
        )
        mainHandler.post {
            try {
                result.set(reconcileActiveNotifications())
            } finally {
                completed.countDown()
            }
        }
        if (!completed.await(HEALTH_PROBE_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
            return PaymentListenerEndpointProbeResult.FAILED
        }
        return result.get()
    }

    private fun isEffectiveListener(): Boolean =
        accessController.effectiveGeneration() == generation

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
                    // A REVIEW candidate is still a confirmed pending workflow record.
                    // Silencing it makes a safely detected payment invisible to
                    // the user until they manually open the review queue.
                    PaymentDetectionListenerRuntime.markAlertResult(
                        candidateNotifier.notifyCandidate(
                            persistenceResult.candidateId,
                        ),
                    )
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
        PaymentDetectionListenerRuntime.markNotificationProcessed(
            generation,
            envelope.notificationKey,
            envelope.postedAtEpochMillis,
        )
    }

    private fun reconcileActiveNotifications(): PaymentListenerEndpointProbeResult {
        // A skipped snapshot is not a healthy listener probe. In particular, a
        // settings-storage error must never masquerade as successful recovery.
        val windowStartedAt = try {
            settingsStore.recoveryWindowStartedAt()
        } catch (_: RuntimeException) {
            return PaymentListenerEndpointProbeResult.SETTINGS_FAILURE
        } ?: return PaymentListenerEndpointProbeResult.SKIPPED_DISABLED

        val now = System.currentTimeMillis()
        val floor = maxOf(windowStartedAt, now - MAX_RECOVERY_LOOKBACK_MS)
        val notifications = try {
            activeNotifications.toList()
        } catch (_: RuntimeException) {
            PaymentDetectionListenerRuntime.markActiveSnapshotFailure()
            return PaymentListenerEndpointProbeResult.FAILED
        }

        // Only package metadata is inspected for unselected notifications.
        // A supported source in the tray, a selected source in the lookback
        // window, and a replayed event are different forms of evidence.
        val supportedNotifications = notifications.filter {
            SupportedPaymentAppCatalog.findByPackageName(it.packageName) != null
        }
        val eligibleNotifications = supportedNotifications.asSequence()
            .filter { it.postTime in floor..(now + MAX_CLOCK_SKEW_MS) }
            .filter { settingsStore.isProcessingAllowed(it.packageName) }
            .toList()
        PaymentDetectionListenerRuntime.markActiveSnapshotRead(
            supportedNotifications.size,
            eligibleNotifications.size,
        )

        // Prefer the newest eligible notifications, retaining the bounded cap
        // and technical deduplication of the existing recovery path.
        val selectedNotifications = eligibleNotifications.asSequence()
            .filter {
                !PaymentDetectionListenerRuntime.wasNotificationProcessed(
                    generation,
                    it.key,
                    it.postTime,
                )
            }
            .sortedByDescending { it.postTime }
            .take(MAX_RECOVERY_NOTIFICATIONS)
            .toList()
        PaymentDetectionListenerRuntime.markActiveNotificationReplays(
            selectedNotifications.size,
        )

        val newestSelectedPostTime =
            selectedNotifications.maxOfOrNull { it.postTime }
        val missedCallbackRecovered =
            newestSelectedPostTime != null &&
                PaymentDetectionListenerRuntime.hasEvidenceOfMissedSelectedCallback(
                    generation,
                    newestSelectedPostTime,
                )

        selectedNotifications
            .sortedBy { it.postTime }
            .forEach(::enqueueNotification)

        return if (missedCallbackRecovered) {
            PaymentListenerEndpointProbeResult.MISSED_CALLBACK_RECOVERED
        } else {
            PaymentListenerEndpointProbeResult.HEALTHY
        }
    }

    companion object {
        private const val MAX_RECOVERY_LOOKBACK_MS =
            14L * 24L * 60L * 60L * 1000L
        private const val MAX_CLOCK_SKEW_MS = 5L * 60L * 1000L
        private const val MAX_RECOVERY_NOTIFICATIONS = 128
        private const val HEALTH_PROBE_TIMEOUT_SECONDS = 3L
        private const val HEALTH_HEARTBEAT_INTERVAL_MS = 60_000L
        private val RECONNECT_SETTLE_DELAYS_MS =
            longArrayOf(1_000L, 3_000L, 7_000L)
    }
}

/**
 * Original component retained as a migration fallback for existing grants.
 * New installs and upgraded users should grant AuraNotificationListenerServiceV2.
 */
class AuraNotificationListenerService : BaseAuraNotificationListenerService() {
    override val generation = PaymentListenerGeneration.LEGACY
}

/**
 * Current listener component. A distinct ComponentName gives Android a fresh
 * notification-filter state instead of inheriting legacy alerting-only defaults.
 */
class AuraNotificationListenerServiceV2 : BaseAuraNotificationListenerService() {
    override val generation = PaymentListenerGeneration.CURRENT
}
