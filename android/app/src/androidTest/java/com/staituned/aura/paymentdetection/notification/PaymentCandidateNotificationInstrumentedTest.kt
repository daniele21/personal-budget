package com.staituned.aura.paymentdetection.notification

import android.Manifest
import android.app.Notification
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Intent
import android.os.ParcelFileDescriptor
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.staituned.aura.paymentdetection.data.NativePurgeReason
import com.staituned.aura.paymentdetection.data.PaymentCandidateRepository
import com.staituned.aura.paymentdetection.data.PaymentDetectionPrivacyStore
import com.staituned.aura.paymentdetection.domain.PaymentDetectionResult
import com.staituned.aura.paymentdetection.domain.PaymentMatchTier
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.FileInputStream

@RunWith(AndroidJUnit4::class)
class PaymentCandidateNotificationInstrumentedTest {
    private val context =
        InstrumentationRegistry.getInstrumentation().targetContext
    private val privacyStore = PaymentDetectionPrivacyStore(context)
    private val notifier = PaymentCandidateNotifier(context)
    private val notificationManager =
        context.getSystemService(NotificationManager::class.java)

    @After
    fun tearDown() {
        notifier.cancelAll()
        runCatching { privacyStore.purge(NativePurgeReason.TOTAL_DELETION) }
    }

    @Test
    fun privateNotificationIsRedactedAndUsesImmutableUniqueActions() {
        val repository = prepareRepository()
        val created = repository.persist(candidate(), "notification-key")
        shell("pm grant ${context.packageName} ${Manifest.permission.POST_NOTIFICATIONS}")

        assertTrue(notifier.notifyCandidate(created.candidateId))
        val active = waitForNotification(created.candidateId)
        val notification = active.notification

        assertEquals(
            NotificationManager.IMPORTANCE_DEFAULT,
            notificationManager.getNotificationChannel(
                PaymentCandidateNotifier.CHANNEL_ID,
            ).importance,
        )
        assertEquals(Notification.VISIBILITY_PRIVATE, notification.visibility)
        assertEquals("Aura Dev", notification.extras.getString(Notification.EXTRA_TITLE))
        assertEquals(
            "Nuovo pagamento da verificare",
            notification.extras.getString(Notification.EXTRA_TEXT),
        )
        assertEquals(
            "Nuovo pagamento da verificare",
            notification.publicVersion.extras.getString(Notification.EXTRA_TEXT),
        )
        assertEquals(2, notification.actions.size)
        assertEquals("Verifica", notification.actions[0].title.toString())
        assertEquals("Ignora", notification.actions[1].title.toString())
        assertTrue(notification.contentIntent.isImmutable)
        assertTrue(notification.actions.all { it.actionIntent.isImmutable })
        assertTrue(notification.actions[1].actionIntent.isBroadcast)
        assertFalse(
            notifier.candidateUri(created.candidateId).toString().contains("1234"),
        )
        assertFalse(
            notifier.candidateUri(created.candidateId).toString()
                .contains("Negozio"),
        )
    }

    @Test
    fun ignoreActionDeletesPayloadWithoutOpeningAnActivity() {
        val repository = prepareRepository()
        val created = repository.persist(candidate(), "ignore-notification-key")
        shell("pm grant ${context.packageName} ${Manifest.permission.POST_NOTIFICATIONS}")
        assertTrue(notifier.notifyCandidate(created.candidateId))
        val ignoreAction = waitForNotification(created.candidateId)
            .notification
            .actions[1]

        assertTrue(ignoreAction.actionIntent.isBroadcast)
        ignoreAction.actionIntent.send()

        waitUntil("candidate ignore") {
            repository.listPending().isEmpty()
        }
        waitUntil("notification cancellation") {
            notificationManager.activeNotifications.none {
                it.tag == created.candidateId
            }
        }
        assertEquals(1, repository.countForActiveOwner())
    }

    @Test
    fun receiverIsNotExportedAndInvalidIntentCannotMutateCandidate() {
        val repository = prepareRepository()
        val created = repository.persist(candidate(), "spoof-notification-key")
        val receiver = context.packageManager.getPackageInfo(
            context.packageName,
            android.content.pm.PackageManager.PackageInfoFlags.of(
                android.content.pm.PackageManager.GET_RECEIVERS.toLong(),
            ),
        ).receivers.orEmpty().single {
            it.name == PaymentCandidateActionReceiver::class.java.name
        }

        assertFalse(receiver.exported)
        PaymentCandidateActionReceiver().onReceive(
            context,
            Intent()
                .setComponent(
                    ComponentName(context, PaymentCandidateActionReceiver::class.java),
                )
                .setAction(PaymentCandidateNotifier.ACTION_IGNORE_CANDIDATE)
                .setData(
                    notifier.candidateUri(created.candidateId)
                        .buildUpon()
                        .appendQueryParameter("amount", "1234")
                        .build(),
                ),
        )

        assertEquals(1, repository.listPending().size)
    }

    private fun prepareRepository(): PaymentCandidateRepository {
        privacyStore.purge(NativePurgeReason.LOCAL_RESET)
        privacyStore.registerOwner("notification-test-owner")
        return PaymentCandidateRepository(context, privacyStore)
    }

    private fun candidate() = PaymentDetectionResult.Candidate(
        tier = PaymentMatchTier.EXACT,
        sourceAppId = "aura-synthetic-source",
        operationType = "card_payment",
        amountMinorUnits = 1234,
        currency = "EUR",
        merchant = "Negozio di prova",
        occurredAtEpochMillis = 1_754_000_000_000L,
        matchedRuleId = "synthetic-wallet-card-payment-v1",
        ruleVersion = "synthetic-wallet-v1",
    )

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

    private fun waitForNotification(candidateId: String): android.service.notification.StatusBarNotification {
        repeat(50) {
            notificationManager.activeNotifications.firstOrNull {
                it.tag == candidateId
            }?.let { return it }
            Thread.sleep(100)
        }
        throw AssertionError("candidate notification did not become ready.")
    }
}
