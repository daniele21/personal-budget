package com.staituned.aura

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import com.staituned.aura.paymentdetection.data.NativePurgeReason
import com.staituned.aura.paymentdetection.data.PaymentDetectionPrivacyStore
import com.staituned.aura.paymentdetection.data.PaymentDetectionSettingsStore

/**
 * Debug-only, fixed-input harness for the host-side Wallet simulation script.
 * It cannot accept notification content or a caller-supplied package.
 */
class SyntheticPaymentDetectionSetupActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val privacyStore = PaymentDetectionPrivacyStore(applicationContext)
        val settingsStore = PaymentDetectionSettingsStore(
            applicationContext,
            privacyStore,
        )
        val harnessPreferences = getSharedPreferences(
            HARNESS_PREFERENCES,
            MODE_PRIVATE,
        )

        try {
            if (intent.getStringExtra(MODE_EXTRA) == MODE_CLEANUP) {
                if (harnessPreferences.getBoolean(CREATED_SYNTHETIC_OWNER, false)) {
                    privacyStore.purge(NativePurgeReason.LOCAL_RESET)
                } else if (privacyStore.hasActiveOwner()) {
                    settingsStore.updateSettings(false, emptySet())
                }
                harnessPreferences.edit().clear().commit()
            } else {
                if (!privacyStore.hasActiveOwner()) {
                    privacyStore.registerOwner(SYNTHETIC_OWNER)
                    check(
                        harnessPreferences.edit()
                            .putBoolean(CREATED_SYNTHETIC_OWNER, true)
                            .commit(),
                    )
                }
                settingsStore.updateSettings(
                    requestedEnabled = true,
                    selectedPackages = setOf(SYNTHETIC_PACKAGE),
                )
                startActivity(
                    Intent().setComponent(
                        ComponentName(
                            SYNTHETIC_PACKAGE,
                            SYNTHETIC_ACTIVITY,
                        ),
                    ),
                )
            }
        } finally {
            finish()
        }
    }

    companion object {
        private const val MODE_EXTRA = "mode"
        private const val MODE_CLEANUP = "cleanup"
        private const val HARNESS_PREFERENCES =
            "aura_payment_detection_simulation_harness"
        private const val CREATED_SYNTHETIC_OWNER = "created_synthetic_owner"
        private const val SYNTHETIC_OWNER = "aura-wallet-simulation-owner"
        private const val SYNTHETIC_PACKAGE =
            "com.staituned.aura.syntheticnotifications"
        private const val SYNTHETIC_ACTIVITY =
            "com.staituned.aura.testsource.SyntheticNotificationActivity"
    }
}
