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
            .remove(LEGACY_RECOVERY_BASELINE_AT)

        if (!requestedEnabled) {
            editor.remove(RECOVERY_WINDOW_STARTED_AT)
        } else if (
            !wasEnabled ||
            previousPackages != selectedPackages ||
            !preferences.contains(RECOVERY_WINDOW_STARTED_AT)
        ) {
            // Recovery begins at the latest affirmative enable/source-selection
            // boundary. The window does not advance after callbacks: replay is
            // intentionally idempotent through the technical fingerprint so an
            // out-of-order or missed callback cannot move past an older payment.
            editor.putLong(RECOVERY_WINDOW_STARTED_AT, now())
        }

        check(editor.commit()) {
            "Unable to persist payment-detection settings."
        }
        return getSettings()
    }

    /**
     * Lower bound for active-notification reconciliation.
     *
     * Existing 1.0.15 installs may have a monotonic legacy watermark. That
     * value is already inside the user's enabled period, so it is safe to use
     * once as the start of the stable V2 recovery window. Older installs with
     * no recovery metadata start at "now" and never retroactively inspect tray
     * content that predates this migration.
     */
    @Synchronized
    fun recoveryWindowStartedAt(): Long? {
        privacyStore.requireActiveOwnerHash()
        if (!preferences.getBoolean(REQUESTED_ENABLED, false)) return null

        val existing = preferences.getLong(RECOVERY_WINDOW_STARTED_AT, 0L)
        if (existing > 0L) return existing

        val legacy = preferences.getLong(LEGACY_RECOVERY_BASELINE_AT, 0L)
        val startedAt = legacy.takeIf { it > 0L }?.coerceAtMost(now()) ?: now()
        check(
            preferences.edit()
                .putLong(RECOVERY_WINDOW_STARTED_AT, startedAt)
                .remove(LEGACY_RECOVERY_BASELINE_AT)
                .commit(),
        ) {
            "Unable to persist listener recovery window."
        }
        return startedAt
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
        private const val RECOVERY_WINDOW_STARTED_AT =
            "listener_recovery_window_started_at_v2"
        private const val LEGACY_RECOVERY_BASELINE_AT =
            "listener_recovery_baseline_at"
    }
}
