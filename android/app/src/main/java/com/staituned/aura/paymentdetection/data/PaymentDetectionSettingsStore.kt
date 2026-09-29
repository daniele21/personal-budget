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
    private val now: () -> Long = System::currentTimeMillis,
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

        val wasEnabled = preferences.getBoolean(REQUESTED_ENABLED, false)
        val previousPackages = preferences.getStringSet(SELECTED_PACKAGES, emptySet())
            ?.toSet()
            ?: emptySet()
        val editor = preferences.edit()
            .putBoolean(REQUESTED_ENABLED, requestedEnabled)
            .putStringSet(SELECTED_PACKAGES, selectedPackages)

        if (!requestedEnabled) {
            editor.remove(RECOVERY_BASELINE_AT)
        } else if (
            !wasEnabled ||
            previousPackages != selectedPackages ||
            !preferences.contains(RECOVERY_BASELINE_AT)
        ) {
            // The recovery window starts at the user's latest affirmative
            // enable/source-selection boundary. This prevents reconnect scans
            // from importing notifications that predate the user's choice.
            editor.putLong(RECOVERY_BASELINE_AT, now())
        }

        check(editor.commit()) {
            "Unable to persist payment-detection settings."
        }
        return getSettings()
    }

    /**
     * Returns the lower bound for reconnect reconciliation.
     *
     * Existing installs created before this field existed are initialized to
     * "now" on first access, so upgrading never retroactively processes old
     * notification-tray content.
     */
    @Synchronized
    fun recoveryBaselineAt(): Long? {
        privacyStore.requireActiveOwnerHash()
        if (!preferences.getBoolean(REQUESTED_ENABLED, false)) return null
        val existing = preferences.getLong(RECOVERY_BASELINE_AT, 0L)
        if (existing > 0L) return existing

        val baseline = now()
        check(preferences.edit().putLong(RECOVERY_BASELINE_AT, baseline).commit()) {
            "Unable to persist listener recovery baseline."
        }
        return baseline
    }

    /**
     * Advances the recovery watermark only after a selected notification has
     * passed extraction/evaluation/persistence without throwing. A reconnect
     * can therefore replay notifications posted after the last safe point.
     */
    @Synchronized
    fun markNotificationObserved(postedAtEpochMillis: Long) {
        privacyStore.requireActiveOwnerHash()
        if (!preferences.getBoolean(REQUESTED_ENABLED, false)) return
        if (postedAtEpochMillis <= 0L) return

        val bounded = postedAtEpochMillis.coerceAtMost(now())
        val current = preferences.getLong(RECOVERY_BASELINE_AT, 0L)
        if (bounded <= current) return
        check(preferences.edit().putLong(RECOVERY_BASELINE_AT, bounded).commit()) {
            "Unable to advance listener recovery baseline."
        }
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
        private const val RECOVERY_BASELINE_AT = "listener_recovery_baseline_at"
    }
}
