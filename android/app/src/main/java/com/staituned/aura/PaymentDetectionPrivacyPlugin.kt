package com.staituned.aura

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.staituned.aura.paymentdetection.data.NativePurgeReason
import com.staituned.aura.paymentdetection.data.PaymentDetectionPrivacyStore

/**
 * M3 privacy foundation only. Payment detection remains unsupported until the
 * listener, candidate repository, and review contract are implemented.
 */
@CapacitorPlugin(name = "PaymentDetection")
class PaymentDetectionPrivacyPlugin : Plugin() {
    private lateinit var privacyStore: PaymentDetectionPrivacyStore

    override fun load() {
        super.load()
        privacyStore = PaymentDetectionPrivacyStore(context)
        try {
            privacyStore.recoverInterruptedPurge()
        } catch (_: RuntimeException) {
            // Fail closed: methods below reject until the purge can complete.
        }
    }

    @PluginMethod
    fun registerOwner(call: PluginCall) {
        val firebaseUid = call.getString("firebaseUid")
        if (firebaseUid.isNullOrBlank()) {
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
}
