package com.staituned.aura.paymentdetection.security

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.staituned.aura.paymentdetection.data.NativePurgeReason
import com.staituned.aura.paymentdetection.data.PaymentDetectionPrivacyStore
import androidx.test.platform.app.InstrumentationRegistry
import java.nio.charset.StandardCharsets
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class PaymentDetectionSecurityInstrumentedTest {
    @Test
    fun ownerHashIsStableAndDoesNotExposeTheFirebaseUid() {
        val hasher = OwnerKeyHasher()
        val first = hasher.hashFirebaseUid("firebase-user-a")
        val repeated = hasher.hashFirebaseUid("firebase-user-a")
        val other = hasher.hashFirebaseUid("firebase-user-b")

        assertTrue(first.length >= 40)
        assertTrue(first.matches(Regex("^[A-Za-z0-9_-]+$")))
        assertFalse(first.contains("firebase-user-a"))
        assertArrayEquals(
            first.toByteArray(StandardCharsets.UTF_8),
            repeated.toByteArray(StandardCharsets.UTF_8),
        )
        assertNotEquals(first, other)
    }

    @Test
    fun candidatePayloadUsesAuthenticatedEncryption() {
        val protector = CandidateFieldProtector()
        val plaintext = """{"amountMinorUnits":1234,"merchant":"Synthetic"}"""
            .toByteArray(StandardCharsets.UTF_8)
        val protectedField = protector.protect(
            plaintext = plaintext,
            candidateId = "candidate-1",
            ownerKeyHash = "owner-1",
            schemaVersion = 1,
        )

        assertFalse(protectedField.ciphertext.contentEquals(plaintext))
        assertArrayEquals(
            plaintext,
            protector.unprotect(
                protectedField = protectedField,
                candidateId = "candidate-1",
                ownerKeyHash = "owner-1",
                schemaVersion = 1,
            ),
        )

        try {
            protector.unprotect(
                protectedField = protectedField,
                candidateId = "candidate-1",
                ownerKeyHash = "owner-2",
                schemaVersion = 1,
            )
            fail("Associated-data mismatch must be rejected.")
        } catch (_: CandidateAuthenticationException) {
            // Expected.
        }
    }

    @Test
    fun candidateFingerprintsAreKeyedStableAndOwnerScoped() {
        val hasher = CandidateFingerprintHasher()
        val technical = hasher.hashTechnical(
            ownerKeyHash = "owner-a",
            sourceAppId = "synthetic-source",
            notificationKey = "notification-key",
        )
        val repeated = hasher.hashTechnical(
            ownerKeyHash = "owner-a",
            sourceAppId = "synthetic-source",
            notificationKey = "notification-key",
        )
        val otherOwner = hasher.hashTechnical(
            ownerKeyHash = "owner-b",
            sourceAppId = "synthetic-source",
            notificationKey = "notification-key",
        )
        val merchantCaseVariant = hasher.hashSemantic(
            "owner-a",
            "card_payment",
            1234,
            "EUR",
            "Negozio",
        )
        val normalizedMerchantCaseVariant = hasher.hashSemantic(
            "owner-a",
            "card_payment",
            1234,
            "EUR",
            "NEGOZIO",
        )

        assertEquals(technical, repeated)
        assertNotEquals(technical, otherOwner)
        assertFalse(technical.contains("notification-key"))
        assertEquals(merchantCaseVariant, normalizedMerchantCaseVariant)
    }

    @Test
    fun acceptanceTokenIsDeterministicForOneReservationAndCannotBeReusedForAnother() {
        val factory = AcceptanceTokenFactory()
        val token = factory.create("owner-a", "candidate-a", "transaction-a")
        val repeated = factory.create("owner-a", "candidate-a", "transaction-a")
        val otherReservation =
            factory.create("owner-a", "candidate-a", "transaction-b")

        assertEquals(token, repeated)
        assertNotEquals(token, otherReservation)
        assertTrue(factory.matches(token, factory.hash(token)))
        assertFalse(factory.matches(otherReservation, factory.hash(token)))
    }

    @Test
    fun purgeRemovesTheOwnerBoundaryAndCanRecoverForAReLogin() {
        val context =
            InstrumentationRegistry.getInstrumentation().targetContext
        val store = PaymentDetectionPrivacyStore(
            context = context,
            namespace = "payment_detection_instrumentation",
        )

        store.purge(NativePurgeReason.LOCAL_RESET)
        store.registerOwner("firebase-user-a")
        assertTrue(store.hasActiveOwner())

        store.registerOwner("firebase-user-b")
        assertTrue(store.hasActiveOwner())

        store.purge(NativePurgeReason.TOTAL_DELETION)
        assertFalse(store.hasActiveOwner())

        store.registerOwner("firebase-user-a")
        assertTrue(store.hasActiveOwner())
        store.purge(NativePurgeReason.TOTAL_DELETION)
    }
}
