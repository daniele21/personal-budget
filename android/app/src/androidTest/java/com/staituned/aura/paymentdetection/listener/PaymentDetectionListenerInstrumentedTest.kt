package com.staituned.aura.paymentdetection.listener

import android.app.Notification
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Intent
import android.os.ParcelFileDescriptor
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.staituned.aura.paymentdetection.data.NativePurgeReason
import com.staituned.aura.paymentdetection.data.PaymentDetectionPrivacyStore
import com.staituned.aura.paymentdetection.data.PaymentDetectionSettingsStore
import com.staituned.aura.paymentdetection.data.SupportedPaymentAppCatalog
import com.staituned.aura.paymentdetection.domain.PaymentMatchTier
import com.staituned.aura.paymentdetection.notification.PaymentCandidateNotifier
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.FileInputStream

@RunWith(AndroidJUnit4::class)
class PaymentDetectionListenerInstrumentedTest {
    private val context =
        InstrumentationRegistry.getInstrumentation().targetContext

    @Test
    fun settingsKeepRequestedStateSeparateAndRejectUnsupportedPackages() {
        val namespace = "payment_detection_listener_instrumentation"
        val privacyStore = PaymentDetectionPrivacyStore(
            context = context,
            namespace = namespace,
        )
        val settingsStore = PaymentDetectionSettingsStore(
            context = context,
            privacyStore = privacyStore,
            namespace = namespace,
        )
        privacyStore.purge(NativePurgeReason.LOCAL_RESET)
        privacyStore.registerOwner("synthetic-listener-owner")

        val settings = settingsStore.updateSettings(
            requestedEnabled = true,
            selectedPackages = setOf(SYNTHETIC_PACKAGE),
        )

        assertTrue(settings.requestedEnabled)
        assertTrue(settingsStore.isProcessingAllowed(SYNTHETIC_PACKAGE))
        assertFalse(settingsStore.isProcessingAllowed("com.example.unsupported"))
        try {
            settingsStore.updateSettings(true, setOf("com.example.unsupported"))
            throw AssertionError("Unsupported package must be rejected.")
        } catch (_: IllegalArgumentException) {
            // Expected.
        }

        privacyStore.purge(NativePurgeReason.TOTAL_DELETION)
        assertFalse(settingsStore.isProcessingAllowed(SYNTHETIC_PACKAGE))
    }

    @Test
    fun catalogSeesOnlyTheControlledInstalledTestSource() {
        val installed = SupportedPaymentAppCatalog.installedApps(context)

        assertTrue(installed.any { it.packageName == SYNTHETIC_PACKAGE })
        assertTrue(installed.all { it.syntheticOnly })
    }

    @Test
    fun envelopeReadsOnlyThreeBoundedFields() {
        val longValue = "x".repeat(800)
        val notification = Notification.Builder(context, "synthetic-test")
            .setContentTitle(longValue)
            .setContentText("Synthetic text")
            .setStyle(Notification.BigTextStyle().bigText("Synthetic big text"))
            .build()

        val envelope = PaymentNotificationEnvelopeReader.read(
            notification = notification,
            postedAtEpochMillis = 1_754_000_000_000L,
            notificationKey = "synthetic-key",
        )

        assertEquals(512, envelope.title?.length)
        assertEquals("Synthetic text", envelope.text)
        assertEquals("Synthetic big text", envelope.bigText)
        assertEquals(1_754_000_000_000L, envelope.postedAtEpochMillis)
        assertEquals("synthetic-key", envelope.notificationKey)
    }

    @Test
    fun controlledTestAppReachesListenerWithoutLaunchingAuraUi() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val component = ComponentName(
            context,
            AuraNotificationListenerService::class.java,
        ).flattenToString()
        val privacyStore = PaymentDetectionPrivacyStore(context)
        val settingsStore = PaymentDetectionSettingsStore(context, privacyStore)
        privacyStore.purge(NativePurgeReason.LOCAL_RESET)
        privacyStore.registerOwner("synthetic-end-to-end-owner")
        settingsStore.updateSettings(true, setOf(SYNTHETIC_PACKAGE))
        PaymentDetectionListenerRuntime.resetAcceptedEnvelopeCount()

        try {
            shell(
                "pm grant ${context.packageName} " +
                    "android.permission.POST_NOTIFICATIONS",
            )
            shell("cmd notification allow_listener $component")
            waitUntil("listener connection") {
                PaymentDetectionListenerRuntime.isConnected()
            }
            shell(
                "pm grant $SYNTHETIC_PACKAGE " +
                    "android.permission.POST_NOTIFICATIONS",
            )
            context.startActivity(
                Intent()
                    .setComponent(
                        ComponentName(
                            SYNTHETIC_PACKAGE,
                            "com.staituned.aura.testsource.SyntheticNotificationActivity",
                        ),
                    )
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )

            waitUntil("synthetic notification callback") {
                PaymentDetectionListenerRuntime.acceptedEnvelopeCount() == 1
            }
            waitUntil("synthetic exact match") {
                PaymentDetectionListenerRuntime.detectedCount(PaymentMatchTier.EXACT) == 1
            }
            waitUntil("synthetic candidate persistence") {
                PaymentDetectionListenerRuntime.persistedCandidateCount() == 1
            }
            assertEquals(0, PaymentDetectionListenerRuntime.persistenceFailureCount())
            waitUntil("private Aura candidate notification") {
                context.getSystemService(NotificationManager::class.java)
                    .activeNotifications
                    .any {
                        it.notification.channelId ==
                            PaymentCandidateNotifier.CHANNEL_ID
                    }
            }
            assertEquals(
                0,
                PaymentDetectionListenerRuntime.detectedCount(PaymentMatchTier.REVIEW),
            )
            assertEquals(
                0,
                PaymentDetectionListenerRuntime.detectedCount(PaymentMatchTier.IGNORED),
            )
        } finally {
            shell("cmd notification disallow_listener $component")
            PaymentCandidateNotifier(context).cancelAll()
            privacyStore.purge(NativePurgeReason.TOTAL_DELETION)
        }
    }

    private fun shell(command: String) {
        val descriptor: ParcelFileDescriptor =
            InstrumentationRegistry.getInstrumentation()
                .uiAutomation
                .executeShellCommand(command)
        FileInputStream(descriptor.fileDescriptor).use { it.readBytes() }
        descriptor.close()
    }

    private fun waitUntil(label: String, predicate: () -> Boolean) {
        repeat(50) {
            if (predicate()) return
            Thread.sleep(100)
        }
        throw AssertionError("$label did not become ready.")
    }

    companion object {
        private const val SYNTHETIC_PACKAGE =
            "com.staituned.aura.syntheticnotifications"
    }
}
