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
import com.staituned.aura.paymentdetection.service.PaymentListenerRecoveryCoordinator
import com.staituned.aura.paymentdetection.service.PaymentListenerRecoveryResult
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
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
    fun recoveryWindowStartsAtEnableAndDoesNotAdvancePastMissedCallbacks() {
        val namespace = "payment_detection_recovery_window_instrumentation"
        var clock = 1_800_000_000_000L
        val privacyStore = PaymentDetectionPrivacyStore(
            context = context,
            namespace = namespace,
        )
        val settingsStore = PaymentDetectionSettingsStore(
            context = context,
            privacyStore = privacyStore,
            namespace = namespace,
            now = { clock },
        )
        privacyStore.purge(NativePurgeReason.LOCAL_RESET)
        privacyStore.registerOwner("synthetic-recovery-owner")

        settingsStore.updateSettings(
            requestedEnabled = true,
            selectedPackages = setOf(SYNTHETIC_PACKAGE),
        )
        assertEquals(clock, settingsStore.recoveryWindowStartedAt())

        clock += 500L
        assertEquals(
            1_800_000_000_000L,
            settingsStore.recoveryWindowStartedAt(),
        )

        settingsStore.updateSettings(
            requestedEnabled = true,
            selectedPackages = emptySet(),
        )
        assertEquals(clock, settingsStore.recoveryWindowStartedAt())

        settingsStore.updateSettings(
            requestedEnabled = false,
            selectedPackages = emptySet(),
        )
        assertNull(settingsStore.recoveryWindowStartedAt())
        privacyStore.purge(NativePurgeReason.TOTAL_DELETION)
    }

    @Test
    fun reconnectReconcilesSelectedPaymentPostedDuringListenerBlackout() {
        val component = currentComponent()
        val privacyStore = PaymentDetectionPrivacyStore(context)
        val settingsStore = PaymentDetectionSettingsStore(context, privacyStore)
        resetListenerGrants()
        privacyStore.purge(NativePurgeReason.LOCAL_RESET)
        privacyStore.registerOwner("synthetic-reconnect-owner")
        settingsStore.updateSettings(true, setOf(SYNTHETIC_PACKAGE))
        PaymentDetectionListenerRuntime.resetAcceptedEnvelopeCount()

        try {
            grantNotificationPermissions()
            shell("cmd notification disallow_listener $component")
            Thread.sleep(300)

            postSyntheticNotification()
            Thread.sleep(500)
            assertEquals(0, PaymentDetectionListenerRuntime.acceptedEnvelopeCount())

            shell("cmd notification allow_listener $component")
            waitUntil("V2 listener reconnect") {
                PaymentDetectionListenerRuntime.isConnected(
                    PaymentListenerGeneration.CURRENT,
                )
            }
            waitUntil("reconciled exact match") {
                PaymentDetectionListenerRuntime.detectedCount(
                    PaymentMatchTier.EXACT,
                ) >= 1
            }
            waitUntil("reconciled candidate persistence") {
                PaymentDetectionListenerRuntime.persistedCandidateCount() >= 1
            }
            assertEquals(0, PaymentDetectionListenerRuntime.persistenceFailureCount())
        } finally {
            resetListenerGrants()
            shell("am force-stop $SYNTHETIC_PACKAGE")
            PaymentCandidateNotifier(context).cancelAll()
            privacyStore.purge(NativePurgeReason.TOTAL_DELETION)
        }
    }

    @Test
    fun healthProbeRecoversPaymentWhenConnectedCallbackIsMissed() {
        val component = currentComponent()
        val privacyStore = PaymentDetectionPrivacyStore(context)
        val settingsStore = PaymentDetectionSettingsStore(context, privacyStore)
        resetListenerGrants()
        privacyStore.purge(NativePurgeReason.LOCAL_RESET)
        privacyStore.registerOwner("synthetic-zombie-owner")
        settingsStore.updateSettings(true, setOf(SYNTHETIC_PACKAGE))
        PaymentDetectionListenerRuntime.resetAcceptedEnvelopeCount()

        try {
            grantNotificationPermissions()
            shell("cmd notification allow_listener $component")
            waitUntil("V2 listener connection") {
                PaymentDetectionListenerRuntime.isConnected(
                    PaymentListenerGeneration.CURRENT,
                )
            }

            PaymentDetectionListenerRuntime.suppressNextPostedCallbackForTest()
            postSyntheticNotification()
            Thread.sleep(500)

            assertTrue(
                PaymentDetectionListenerRuntime.isConnected(
                    PaymentListenerGeneration.CURRENT,
                ),
            )
            assertEquals(0, PaymentDetectionListenerRuntime.acceptedEnvelopeCount())

            assertEquals(
                PaymentListenerRecoveryResult.RECONCILED,
                PaymentListenerRecoveryCoordinator(context).recoverNow(),
            )
            waitUntil("health-probe exact recovery") {
                PaymentDetectionListenerRuntime.detectedCount(
                    PaymentMatchTier.EXACT,
                ) >= 1
            }
            waitUntil("health-probe candidate persistence") {
                PaymentDetectionListenerRuntime.persistedCandidateCount() >= 1
            }
            assertEquals(0, PaymentDetectionListenerRuntime.persistenceFailureCount())
        } finally {
            resetListenerGrants()
            shell("am force-stop $SYNTHETIC_PACKAGE")
            PaymentCandidateNotifier(context).cancelAll()
            privacyStore.purge(NativePurgeReason.TOTAL_DELETION)
        }
    }

    @Test
    fun explicitRepairCyclesAStaleCurrentListenerBinding() {
        val component = currentComponent()
        resetListenerGrants()
        try {
            shell("cmd notification allow_listener $component")
            waitUntil("V2 listener connection") {
                PaymentDetectionListenerRuntime.isConnected(
                    PaymentListenerGeneration.CURRENT,
                )
            }
            val before = PaymentDetectionListenerRuntime.connectionEpoch(
                PaymentListenerGeneration.CURRENT,
            )

            assertTrue(
                NotificationAccessController(context).forceRebindIfGranted(),
            )
            waitUntil("V2 listener force-rebind") {
                PaymentDetectionListenerRuntime.connectionEpoch(
                    PaymentListenerGeneration.CURRENT,
                ) > before
            }
        } finally {
            resetListenerGrants()
        }
    }

    @Test
    fun legacyGrantIsDetectedUntilV2AccessIsGranted() {
        val legacy = legacyComponent()
        val current = currentComponent()
        val controller = NotificationAccessController(
            context,
            "payment_listener_access_migration_test",
        )
        resetListenerGrants()

        try {
            shell("cmd notification allow_listener $legacy")
            waitUntil("legacy grant") {
                controller.state().legacyGranted
            }
            assertTrue(controller.isGranted())
            assertTrue(controller.migrationRequired())
            assertFalse(controller.state().currentGranted)

            shell("cmd notification allow_listener $current")
            waitUntil("V2 grant") {
                controller.state().currentGranted
            }
            waitUntil("V2 connection") {
                PaymentDetectionListenerRuntime.isConnected(
                    PaymentListenerGeneration.CURRENT,
                )
            }
            assertFalse(controller.migrationRequired())
            assertEquals(
                PaymentListenerGeneration.CURRENT,
                controller.effectiveGeneration(),
            )
        } finally {
            resetListenerGrants()
        }
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
    fun controlledTestAppReachesV2ListenerWithoutLaunchingAuraUi() {
        val component = currentComponent()
        val privacyStore = PaymentDetectionPrivacyStore(context)
        val settingsStore = PaymentDetectionSettingsStore(context, privacyStore)
        resetListenerGrants()
        privacyStore.purge(NativePurgeReason.LOCAL_RESET)
        privacyStore.registerOwner("synthetic-end-to-end-owner")
        settingsStore.updateSettings(true, setOf(SYNTHETIC_PACKAGE))
        PaymentDetectionListenerRuntime.resetAcceptedEnvelopeCount()

        try {
            grantNotificationPermissions()
            shell("cmd notification allow_listener $component")
            waitUntil("V2 listener connection") {
                PaymentDetectionListenerRuntime.isConnected(
                    PaymentListenerGeneration.CURRENT,
                )
            }
            postSyntheticNotification()

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
            resetListenerGrants()
            PaymentCandidateNotifier(context).cancelAll()
            privacyStore.purge(NativePurgeReason.TOTAL_DELETION)
        }
    }

    private fun grantNotificationPermissions() {
        shell(
            "pm grant ${context.packageName} " +
                "android.permission.POST_NOTIFICATIONS",
        )
        shell(
            "pm grant $SYNTHETIC_PACKAGE " +
                "android.permission.POST_NOTIFICATIONS",
        )
    }

    private fun postSyntheticNotification() {
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
    }

    private fun currentComponent(): String =
        ComponentName(
            context,
            AuraNotificationListenerServiceV2::class.java,
        ).flattenToString()

    private fun legacyComponent(): String =
        ComponentName(
            context,
            AuraNotificationListenerService::class.java,
        ).flattenToString()

    private fun resetListenerGrants() {
        shell("cmd notification disallow_listener ${currentComponent()}")
        shell("cmd notification disallow_listener ${legacyComponent()}")
        Thread.sleep(150)
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
        repeat(80) {
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
