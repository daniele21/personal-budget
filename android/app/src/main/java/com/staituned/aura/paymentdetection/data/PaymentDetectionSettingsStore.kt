package com.staituned.aura.paymentdetection.data

import android.content.Context

internal data class PaymentDetectionSettings(
    val requestedEnabled: Boolean,
    val selectedPackages: Set<String>,
)

internal class PaymentDetectionSettingsStore(
    context: Context,
    private val privacyStore: PaymentDetectionPrivacyStore =
        PaymentDetectionPrivacyStore(context),
    namespace: String = "payment_detection",
) {
    private val preferences = context.getSharedPreferences(
        "aura_${namespace}_settings",
        Context.MODE_PRIVATE,
    )

    @Synchronized
    fun getSettings(): PaymentDetectionSettings {
        privacyStore.requireActiveOwnerHash()
        return PaymentDetectionSettings(
            requestedEnabled = preferences.getBoolean(REQUESTED_ENABLED, false),
            selectedPackages = preferences.getStringSet(SELECTED_PACKAGES, emptySet())
                ?.toSet()
                ?: emptySet(),
        )
    }

    @Synchronized
    fun updateSettings(
        requestedEnabled: Boolean,
        selectedPackages: Set<String>,
    ): PaymentDetectionSettings {
        privacyStore.requireActiveOwnerHash()
        require(SupportedPaymentAppCatalog.packageNames().containsAll(selectedPackages)) {
            "Unsupported payment source."
        }
        check(
            preferences.edit()
                .putBoolean(REQUESTED_ENABLED, requestedEnabled)
                .putStringSet(SELECTED_PACKAGES, selectedPackages)
                .commit(),
        ) {
            "Unable to persist payment-detection settings."
        }
        return getSettings()
    }

    fun isProcessingAllowed(packageName: String): Boolean {
        return try {
            if (!privacyStore.hasActiveOwner()) return false
            if (SupportedPaymentAppCatalog.findByPackageName(packageName) == null) {
                return false
            }
            val settings = getSettings()
            settings.requestedEnabled && packageName in settings.selectedPackages
        } catch (_: RuntimeException) {
            false
        }
    }

    companion object {
        internal const val PREFERENCES_SUFFIX = "_settings"
        private const val REQUESTED_ENABLED = "requested_enabled"
        private const val SELECTED_PACKAGES = "selected_packages"
    }
}
