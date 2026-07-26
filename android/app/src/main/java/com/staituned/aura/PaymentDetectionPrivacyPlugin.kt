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
import com.staituned.aura.paymentdetection.data.PaymentDetectionPrivacyStore
import com.staituned.aura.paymentdetection.data.PaymentDetectionSettings
import com.staituned.aura.paymentdetection.data.PaymentDetectionSettingsStore
import com.staituned.aura.paymentdetection.data.SupportedPaymentAppCatalog
import com.staituned.aura.paymentdetection.listener.NotificationAccessController
import com.staituned.aura.paymentdetection.listener.PaymentDetectionListenerRuntime

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

    override fun load() {
        super.load()
        privacyStore = PaymentDetectionPrivacyStore(context)
        settingsStore = PaymentDetectionSettingsStore(context, privacyStore)
        accessController = NotificationAccessController(context)
        try {
            privacyStore.recoverInterruptedPurge()
        } catch (_: RuntimeException) {
            // Fail closed: owner-dependent methods reject until purge recovers.
        }
    }

    @PluginMethod
    fun registerOwner(call: PluginCall) {
        val firebaseUid = call.getString("firebaseUid")
        if (firebaseUid.isNullOrBlank() || firebaseUid.length > MAX_UID_LENGTH) {
            call.reject("Unable to register the native owner.", "OWNER_INVALID")
            return
        }
        try {
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
            privacyStore.purge(reason)
            call.resolve()
        } catch (_: Exception) {
            call.reject("Unable to clear secure native storage.", "PURGE_FAILED")
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
        val apps = SupportedPaymentAppCatalog.installedApps(context).map { app ->
            JSObject().apply {
                put("id", app.id)
                put("packageName", app.packageName)
                put("displayName", app.displayName)
                put("syntheticOnly", app.syntheticOnly)
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

    private fun statusJson(settings: PaymentDetectionSettings): JSObject =
        JSObject().apply {
            put("supported", true)
            put("requestedEnabled", settings.requestedEnabled)
            put("osPermissionGranted", accessController.isGranted())
            put("listenerConnected", PaymentDetectionListenerRuntime.isConnected())
            put(
                "auraNotificationPermissionGranted",
                context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
                    PackageManager.PERMISSION_GRANTED,
            )
            put("selectedPackages", JSArray(settings.selectedPackages))
        }

    companion object {
        private const val POST_NOTIFICATIONS_ALIAS = "postNotifications"
        private const val MAX_UID_LENGTH = 256
    }
}
