package com.staituned.aura

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import com.staituned.aura.paymentdetection.data.NativePurgeReason
import com.staituned.aura.paymentdetection.data.PaymentDetectionPrivacyStore
import com.staituned.aura.paymentdetection.data.PaymentDetectionSettingsStore
import com.staituned.aura.paymentdetection.domain.PaymentMatchTier
import com.staituned.aura.paymentdetection.listener.PaymentDetectionListenerRuntime

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
            when (intent.getStringExtra(MODE_EXTRA)) {
                MODE_CLEANUP -> {
                    if (harnessPreferences.getBoolean(CREATED_SYNTHETIC_OWNER, false)) {
                        privacyStore.purge(NativePurgeReason.LOCAL_RESET)
                    } else if (privacyStore.hasActiveOwner()) {
                        settingsStore.updateSettings(false, emptySet())
                    }
                    deleteFile(PROBE_FILE)
                    harnessPreferences.edit().clear().commit()
                }
                MODE_PROBE -> writeRedactedProbe()
                MODE_POST -> postSyntheticNotification()
                else -> {
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
                    postSyntheticNotification()
                }
            }
        } finally {
            finish()
        }
    }

    private fun writeRedactedProbe() {
        val values = listOf(
            "connected=${PaymentDetectionListenerRuntime.isConnected()}",
            "accepted=${PaymentDetectionListenerRuntime.acceptedEnvelopeCount()}",
            "exact=${
                PaymentDetectionListenerRuntime.detectedCount(PaymentMatchTier.EXACT)
            }",
            "review=${
                PaymentDetectionListenerRuntime.detectedCount(PaymentMatchTier.REVIEW)
            }",
            "ignored=${
                PaymentDetectionListenerRuntime.detectedCount(PaymentMatchTier.IGNORED)
            }",
        )
        openFileOutput(PROBE_FILE, MODE_PRIVATE).bufferedWriter().use {
            it.write(values.joinToString("\n"))
        }
    }

    private fun postSyntheticNotification() {
        startActivity(
            Intent().setComponent(
                ComponentName(
                    SYNTHETIC_PACKAGE,
                    SYNTHETIC_ACTIVITY,
                ),
            ),
        )
    }

    companion object {
        private const val MODE_EXTRA = "mode"
        private const val MODE_CLEANUP = "cleanup"
        private const val MODE_PROBE = "probe"
        private const val MODE_POST = "post"
        private const val PROBE_FILE = "aura_payment_detection_probe.txt"
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
