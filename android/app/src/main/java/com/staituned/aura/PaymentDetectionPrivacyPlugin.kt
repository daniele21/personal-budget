package com.staituned.aura

import android.Manifest
import android.content.pm.PackageManager
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.staituned.aura.paymentdetection.data.NativePurgeReason
import com.staituned.aura.paymentdetection.data.CandidateNotFoundException
import com.staituned.aura.paymentdetection.data.CandidatePayloadUnavailableException
import com.staituned.aura.paymentdetection.data.CandidateStateException
import com.staituned.aura.paymentdetection.data.CandidateTokenException
import com.staituned.aura.paymentdetection.data.PaymentCandidateRepository
import com.staituned.aura.paymentdetection.data.PaymentDetectionPrivacyStore
import com.staituned.aura.paymentdetection.data.PaymentDetectionSettings
import com.staituned.aura.paymentdetection.data.PaymentDetectionSettingsStore
import com.staituned.aura.paymentdetection.data.SupportedPaymentAppCatalog
import com.staituned.aura.paymentdetection.bridge.PaymentDetectionBridgeMapper
import com.staituned.aura.paymentdetection.bridge.PaymentDetectionBridgeValidator
import com.staituned.aura.paymentdetection.events.PaymentCandidateChange
import com.staituned.aura.paymentdetection.events.PaymentCandidateChangeReason
import com.staituned.aura.paymentdetection.events.PaymentCandidateEventBus
import com.staituned.aura.paymentdetection.listener.NotificationAccessController
import com.staituned.aura.paymentdetection.listener.PaymentDetectionListenerRuntime
import com.staituned.aura.paymentdetection.notification.PaymentCandidateNotifier

@CapacitorPlugin(
    name = "PaymentDetection",
    permissions = [
        Permission(
            alias = "postNotifications",
            strings = [Manifest.permission.POST_NOTIFICATIONS],
        ),
    ],
)
class PaymentDetectionPrivacyPlugin : Plugin() {
    private lateinit var privacyStore: PaymentDetectionPrivacyStore
    private lateinit var settingsStore: PaymentDetectionSettingsStore
    private lateinit var accessController: NotificationAccessController
    private lateinit var candidateRepository: PaymentCandidateRepository
    private lateinit var candidateNotifier: PaymentCandidateNotifier
    private val bridgeMapper = PaymentDetectionBridgeMapper()
    private val candidateChangeListener: (PaymentCandidateChange) -> Unit = { change ->
        notifyListeners(
            CANDIDATE_CHANGED_EVENT,
            JSObject().apply {
                put("reason", change.reason.bridgeValue)
                change.candidateId?.let { put("candidateId", it) }
            },
        )
    }

    override fun load() {
        super.load()
        privacyStore = PaymentDetectionPrivacyStore(context)
        settingsStore = PaymentDetectionSettingsStore(context, privacyStore)
        accessController = NotificationAccessController(context)
        candidateRepository = PaymentCandidateRepository(context, privacyStore)
        candidateNotifier = PaymentCandidateNotifier(context)
        PaymentCandidateEventBus.addListener(candidateChangeListener)
        try {
            privacyStore.recoverInterruptedPurge()
        } catch (_: RuntimeException) {
            // Fail closed: owner-dependent methods reject until purge recovers.
        }
    }

    override fun handleOnDestroy() {
        PaymentCandidateEventBus.removeListener(candidateChangeListener)
        super.handleOnDestroy()
    }

    @PluginMethod
    fun registerOwner(call: PluginCall) {
        val firebaseUid = call.getString("firebaseUid")
        if (firebaseUid.isNullOrBlank() || firebaseUid.length > MAX_UID_LENGTH) {
            call.reject("Unable to register the native owner.", "OWNER_INVALID")
            return
        }
        try {
            candidateNotifier.cancelAll()
            privacyStore.registerOwner(firebaseUid)
            call.resolve()
        } catch (_: Exception) {
            call.reject(
                "Unable to prepare secure native storage.",
                "OWNER_REGISTRATION_FAILED",
            )
        }
    }

    @PluginMethod
    fun purgeForLogoutOrReset(call: PluginCall) {
        val reason = NativePurgeReason.fromBridgeValue(call.getString("reason"))
        if (reason == null) {
            call.reject("Invalid native purge reason.", "PURGE_REASON_INVALID")
            return
        }
        try {
            candidateNotifier.cancelAll()
            privacyStore.purge(reason)
            call.resolve()
        } catch (_: Exception) {
            call.reject("Unable to clear secure native storage.", "PURGE_FAILED")
        }
    }

    @PluginMethod
    fun isSupported(call: PluginCall) {
        call.resolve(JSObject().put("supported", true))
    }

    @PluginMethod
    fun getNotificationAccessStatus(call: PluginCall) {
        call.resolve(notificationAccessJson())
    }

    @PluginMethod
    fun getSettings(call: PluginCall) {
        try {
            call.resolve(settingsJson(settingsStore.getSettings()))
        } catch (_: Exception) {
            call.reject("No active secure owner.", "OWNER_REQUIRED")
        }
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        try {
            val settings = settingsStore.getSettings()
            call.resolve(statusJson(settings))
        } catch (_: Exception) {
            call.reject("No active secure owner.", "OWNER_REQUIRED")
        }
    }

    @PluginMethod
    fun listSupportedApps(call: PluginCall) {
        val apps = SupportedPaymentAppCatalog.supportedApps(context).map { availability ->
            val app = availability.app
            JSObject().apply {
                put("id", app.id)
                put("packageName", app.packageName)
                put("displayName", app.displayName)
                put("syntheticOnly", app.syntheticOnly)
                put("installed", availability.installed)
            }
        }
        call.resolve(JSObject().put("apps", JSArray(apps)))
    }

    @PluginMethod
    fun updateSettings(call: PluginCall) {
        val requestedEnabled = call.getBoolean("requestedEnabled")
        val selectedArray = call.getArray("selectedPackages")
        if (requestedEnabled == null || selectedArray == null) {
            call.reject("Invalid payment-detection settings.", "SETTINGS_INVALID")
            return
        }
        try {
            val selectedPackages = selectedArray.toList<String>().toSet()
            val settings = settingsStore.updateSettings(
                requestedEnabled = requestedEnabled,
                selectedPackages = selectedPackages,
            )
            if (!settings.requestedEnabled) candidateNotifier.cancelAll()
            call.resolve(statusJson(settings))
        } catch (_: Exception) {
            call.reject("Unable to update payment-detection settings.", "SETTINGS_REJECTED")
        }
    }

    @PluginMethod
    fun openNotificationAccessSettings(call: PluginCall) {
        if (accessController.openSettings()) {
            call.resolve()
        } else {
            call.reject("Notification access settings unavailable.", "SETTINGS_UNAVAILABLE")
        }
    }

    @PluginMethod
    fun requestAuraNotificationPermission(call: PluginCall) {
        if (getPermissionState(POST_NOTIFICATIONS_ALIAS) == PermissionState.GRANTED) {
            call.resolve(JSObject().put("granted", true))
            return
        }
        requestPermissionForAlias(
            POST_NOTIFICATIONS_ALIAS,
            call,
            "notificationPermissionCallback",
        )
    }

    @PermissionCallback
    private fun notificationPermissionCallback(call: PluginCall) {
        call.resolve(
            JSObject().put(
                "granted",
                getPermissionState(POST_NOTIFICATIONS_ALIAS) == PermissionState.GRANTED,
            ),
        )
    }

    @PluginMethod
    fun listCandidates(call: PluginCall) {
        resolveCandidateCall(call) {
            JSObject().put(
                "candidates",
                JSArray(candidateRepository.listPending().map(bridgeMapper::candidate)),
            )
        }
    }

    @PluginMethod
    fun getCandidate(call: PluginCall) {
        resolveCandidateCall(call) {
            val candidateId = PaymentDetectionBridgeValidator.requireCandidateId(
                call.getString("candidateId"),
            )
            bridgeMapper.candidate(candidateRepository.get(candidateId))
        }
    }

    @PluginMethod
    fun ignoreCandidate(call: PluginCall) {
        resolveCandidateCall(call) {
            val candidateId = PaymentDetectionBridgeValidator.requireCandidateId(
                call.getString("candidateId"),
            )
            candidateRepository.ignore(candidateId)
            candidateNotifier.cancel(candidateId)
            PaymentCandidateEventBus.publish(
                PaymentCandidateChange(
                    PaymentCandidateChangeReason.IGNORED,
                    candidateId,
                ),
            )
            JSObject()
        }
    }

    @PluginMethod
    fun beginAcceptance(call: PluginCall) {
        resolveCandidateCall(call) {
            val candidateId = PaymentDetectionBridgeValidator.requireCandidateId(
                call.getString("candidateId"),
            )
            bridgeMapper.reservation(
                candidateRepository.beginAcceptance(candidateId),
            )
        }
    }

    @PluginMethod
    fun completeAcceptance(call: PluginCall) {
        resolveCandidateCall(call) {
            val candidateId = PaymentDetectionBridgeValidator.requireCandidateId(
                call.getString("candidateId"),
            )
            val acceptanceToken =
                PaymentDetectionBridgeValidator.requireAcceptanceToken(
                    call.getString("acceptanceToken"),
                )
            val edited = requireNotNull(call.getBoolean("edited"))
            candidateRepository.completeAcceptance(
                candidateId = candidateId,
                acceptanceToken = acceptanceToken,
                edited = edited,
            )
            candidateNotifier.cancel(candidateId)
            PaymentCandidateEventBus.publish(
                PaymentCandidateChange(
                    PaymentCandidateChangeReason.DELETED,
                    candidateId,
                ),
            )
            JSObject()
        }
    }

    @PluginMethod
    fun recoverAcceptance(call: PluginCall) {
        resolveCandidateCall(call) {
            val persistedTransactionIds =
                PaymentDetectionBridgeValidator.requireTransactionIds(
                    call.getArray("persistedTransactionIds"),
                )
            val recovery = candidateRepository.recoverAccepting(
                persistedTransactionIds,
            )
            recovery.completedCandidateIds.forEach { candidateId ->
                candidateNotifier.cancel(candidateId)
                PaymentCandidateEventBus.publish(
                    PaymentCandidateChange(
                        PaymentCandidateChangeReason.DELETED,
                        candidateId,
                    ),
                )
            }
            recovery.returnedToPendingCandidateIds.forEach { candidateId ->
                PaymentCandidateEventBus.publish(
                    PaymentCandidateChange(
                        PaymentCandidateChangeReason.UPDATED,
                        candidateId,
                    ),
                )
            }
            bridgeMapper.recovery(recovery)
        }
    }

    @PluginMethod
    fun deleteAllCandidates(call: PluginCall) {
        resolveCandidateCall(call) {
            val deletedCount = candidateRepository.deleteAllForOwner()
            candidateNotifier.cancelAll()
            PaymentCandidateEventBus.publish(
                PaymentCandidateChange(
                    PaymentCandidateChangeReason.DELETED,
                    null,
                ),
            )
            JSObject().put("deletedCount", deletedCount)
        }
    }

    private fun notificationAccessJson(): JSObject =
        JSObject().apply {
            put("osPermissionGranted", accessController.isGranted())
            put("listenerConnected", PaymentDetectionListenerRuntime.isConnected())
            put(
                "auraNotificationPermissionGranted",
                context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
                    PackageManager.PERMISSION_GRANTED,
            )
        }

    private fun settingsJson(settings: PaymentDetectionSettings): JSObject =
        JSObject().apply {
            put("requestedEnabled", settings.requestedEnabled)
            put("selectedPackages", JSArray(settings.selectedPackages.sorted()))
        }

    private fun statusJson(settings: PaymentDetectionSettings): JSObject =
        settingsJson(settings).apply {
            put("supported", true)
            put("osPermissionGranted", accessController.isGranted())
            put("listenerConnected", PaymentDetectionListenerRuntime.isConnected())
            put(
                "auraNotificationPermissionGranted",
                context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
                    PackageManager.PERMISSION_GRANTED,
            )
        }

    private inline fun resolveCandidateCall(
        call: PluginCall,
        operation: () -> JSObject,
    ) {
        try {
            call.resolve(operation())
        } catch (_: CandidateNotFoundException) {
            call.reject("Payment candidate unavailable.", "CANDIDATE_NOT_FOUND")
        } catch (_: CandidateTokenException) {
            call.reject("Acceptance token rejected.", "ACCEPTANCE_TOKEN_INVALID")
        } catch (_: CandidateStateException) {
            call.reject("Payment candidate state changed.", "CANDIDATE_STATE_INVALID")
        } catch (_: CandidatePayloadUnavailableException) {
            call.reject(
                "Secure candidate storage is unavailable.",
                "CANDIDATE_STORAGE_UNAVAILABLE",
            )
        } catch (_: IllegalArgumentException) {
            call.reject("Invalid payment candidate request.", "ARGUMENT_INVALID")
        } catch (_: Exception) {
            call.reject(
                "Payment candidate operation failed.",
                "CANDIDATE_OPERATION_FAILED",
            )
        }
    }

    companion object {
        private const val POST_NOTIFICATIONS_ALIAS = "postNotifications"
        private const val MAX_UID_LENGTH = 256
        private const val CANDIDATE_CHANGED_EVENT = "candidateChanged"
    }
}
