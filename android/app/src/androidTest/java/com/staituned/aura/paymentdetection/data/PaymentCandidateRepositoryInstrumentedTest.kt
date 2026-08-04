package com.staituned.aura.paymentdetection.data

import android.database.SQLException
import androidx.room.Room
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.staituned.aura.paymentdetection.domain.PaymentDetectionResult
import com.staituned.aura.paymentdetection.domain.PaymentMatchTier
import com.staituned.aura.paymentdetection.security.CandidateFieldProtector
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import java.nio.charset.StandardCharsets
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class PaymentCandidateRepositoryInstrumentedTest {
    private val context =
        InstrumentationRegistry.getInstrumentation().targetContext
    private val databases = mutableListOf<PaymentCandidateDatabase>()
    private val stores = mutableListOf<PaymentDetectionPrivacyStore>()

    @After
    fun tearDown() {
        databases.forEach(PaymentCandidateDatabase::close)
        stores.forEach {
            runCatching { it.purge(NativePurgeReason.TOTAL_DELETION) }
        }
    }

    @Test
    fun payloadIsEncryptedAndRawNotificationFieldsDoNotExistInSchema() {
        val harness = harness("encrypted_payload")
        val result = harness.repository.persist(candidate(), "notification-key-1")

        assertTrue(result is CandidatePersistenceResult.Created)
        val entity = harness.repository.entitiesForActiveOwner().single()
        assertFalse(
            entity.payloadCiphertext!!.contentEquals(
                "Negozio di prova".toByteArray(StandardCharsets.UTF_8),
            ),
        )
        assertTrue(entity.technicalFingerprint.length >= 40)
        assertTrue(entity.semanticFingerprint!!.length >= 40)
        assertNotEquals("notification-key-1", entity.technicalFingerprint)
        val entityFields = PaymentCandidateEntity::class.java.declaredFields
            .map { it.name }
            .toSet()
        assertTrue("title" !in entityFields)
        assertTrue("text" !in entityFields)
        assertTrue("bigText" !in entityFields)

        val record = harness.repository.get(result.candidateId)
        assertEquals(1234L, record.payload.amountMinorUnits)
        assertEquals("Negozio di prova", record.payload.merchant)
    }

    @Test
    fun repeatedTechnicalCallbackUpdatesOneCandidateWithoutDuplicating() {
        val harness = harness("technical_upsert")
        val first = harness.repository.persist(candidate(amount = 1234), "same-key")
        val second = harness.repository.persist(candidate(amount = 4321), "same-key")

        assertTrue(first is CandidatePersistenceResult.Created)
        assertTrue(second is CandidatePersistenceResult.Updated)
        assertEquals(first.candidateId, second.candidateId)
        assertEquals(1, harness.repository.countForActiveOwner())
        assertEquals(
            4321L,
            harness.repository.get(first.candidateId).payload.amountMinorUnits,
        )
    }

    @Test
    fun concurrentRepeatedCallbacksStillCreateOneRow() {
        val harness = harness("concurrent_upsert")
        harness.repository.persist(candidate(), "prewarm-key")
        val executor = Executors.newFixedThreadPool(6)
        try {
            val futures = (1..12).map {
                executor.submit<CandidatePersistenceResult> {
                    harness.repository.persist(candidate(), "concurrent-key")
                }
            }
            futures.forEach { it.get(10, TimeUnit.SECONDS) }
        } finally {
            executor.shutdownNow()
        }

        assertEquals(2, harness.repository.countForActiveOwner())
    }

    @Test
    fun semanticDedupeNormalizesMerchantAndKeepsSourceAndTimeBoundaries() {
        val harness = harness("semantic_dedupe")
        val first = harness.repository.persist(
            candidate(source = "source-wallet"),
            "wallet-key",
            detectedAt = harness.clock.value,
        )
        val duplicate = harness.repository.persist(
            candidate(
                source = "source-bank",
                merchant = "NÉGOZIO-DI PROVA.",
            ),
            "bank-key",
            detectedAt = harness.clock.value + 60_000,
        )
        val differentMerchant = harness.repository.persist(
            candidate(source = "source-bank", merchant = "Altro negozio"),
            "bank-key-2",
            detectedAt = harness.clock.value + 60_000,
        )
        val outsideWindow = harness.repository.persist(
            candidate(source = "source-bank"),
            "bank-key-3",
            detectedAt = harness.clock.value +
                PaymentCandidateRepository.SEMANTIC_DEDUPE_WINDOW_MS + 1,
        )

        assertTrue(first is CandidatePersistenceResult.Created)
        assertTrue(duplicate is CandidatePersistenceResult.Duplicate)
        assertEquals(first.candidateId, duplicate.candidateId)
        assertTrue(differentMerchant is CandidatePersistenceResult.Created)
        assertTrue(outsideWindow is CandidatePersistenceResult.Created)
        assertEquals(3, harness.repository.countForActiveOwner())
    }

    @Test
    fun missingMerchantNeverTriggersSemanticDedupe() {
        val harness = harness("semantic_missing_merchant")
        harness.repository.persist(
            candidate(source = "source-wallet", merchant = null),
            "wallet-key",
        )
        harness.repository.persist(
            candidate(source = "source-bank", merchant = null),
            "bank-key",
        )

        assertEquals(2, harness.repository.countForActiveOwner())
    }

    @Test
    fun ignoreDeletesPayloadAndCleanupHonorsSevenDayTombstone() {
        val harness = harness("ignore_retention")
        val created = harness.repository.persist(candidate(), "ignore-key")
        harness.repository.ignore(created.candidateId)

        val tombstone = harness.repository.entitiesForActiveOwner().single()
        assertEquals(CandidateStatus.IGNORED.storageValue, tombstone.status)
        assertNull(tombstone.payloadCiphertext)
        assertNull(tombstone.payloadNonce)

        harness.clock.value += PaymentCandidateRepository.IGNORED_RETENTION_MS + 1
        harness.repository.cleanup()
        assertEquals(0, harness.repository.countForActiveOwner())
    }

    @Test
    fun pendingCandidateExpiresAfterFourteenDays() {
        val harness = harness("pending_retention")
        harness.repository.persist(candidate(), "pending-key")

        harness.clock.value += PaymentCandidateRepository.PENDING_RETENTION_MS + 1
        harness.repository.cleanup()

        assertEquals(0, harness.repository.countForActiveOwner())
    }

    @Test
    fun expiredCandidateCannotBeFetchedIgnoredOrAcceptedBeforeScheduledCleanup() {
        val harness = harness("expired_bridge_operations")
        val created = harness.repository.persist(candidate(), "expired-key")
        harness.clock.value += PaymentCandidateRepository.PENDING_RETENTION_MS + 1

        assertThrows(CandidateNotFoundException::class.java) {
            harness.repository.get(created.candidateId)
        }
        assertThrows(CandidateNotFoundException::class.java) {
            harness.repository.ignore(created.candidateId)
        }
        assertThrows(CandidateNotFoundException::class.java) {
            harness.repository.beginAcceptance(created.candidateId)
        }
        assertEquals(0, harness.repository.countForActiveOwner())
    }

    @Test
    fun acceptanceIsIdempotentAndRetainsOnlyThirtyDayTombstone() {
        val harness = harness("acceptance")
        val created = harness.repository.persist(candidate(), "accept-key")
        val first = harness.repository.beginAcceptance(created.candidateId)
        val repeated = harness.repository.beginAcceptance(created.candidateId)

        assertEquals(first.acceptanceToken, repeated.acceptanceToken)
        assertEquals(first.reservedTransactionId, repeated.reservedTransactionId)
        harness.repository.completeAcceptance(
            created.candidateId,
            first.acceptanceToken,
            edited = false,
        )
        harness.repository.completeAcceptance(
            created.candidateId,
            first.acceptanceToken,
            edited = false,
        )

        val tombstone = harness.repository.entitiesForActiveOwner().single()
        assertEquals(CandidateStatus.ACCEPTED.storageValue, tombstone.status)
        assertNull(tombstone.payloadCiphertext)
        assertTrue(tombstone.acceptanceTokenHash!!.isNotBlank())

        harness.clock.value += PaymentCandidateRepository.ACCEPTED_RETENTION_MS + 1
        harness.repository.cleanup()
        assertEquals(0, harness.repository.countForActiveOwner())
    }

    @Test
    fun invalidAcceptanceTokenDoesNotDeleteOrCompleteCandidate() {
        val harness = harness("invalid_token")
        val created = harness.repository.persist(candidate(), "token-key")
        harness.repository.beginAcceptance(created.candidateId)

        try {
            harness.repository.completeAcceptance(
                created.candidateId,
                "invalid-token",
                edited = false,
            )
            throw AssertionError("Invalid token must fail.")
        } catch (_: CandidateTokenException) {
            // Expected.
        }

        val entity = harness.repository.entitiesForActiveOwner().single()
        assertEquals(CandidateStatus.ACCEPTING.storageValue, entity.status)
        assertTrue(entity.payloadCiphertext!!.isNotEmpty())
    }

    @Test
    fun recoveryCompletesVerifiedReservationAndReturnsOtherToPending() {
        val harness = harness("recovery")
        val first = harness.repository.persist(candidate(), "recovery-key-1")
        val second = harness.repository.persist(
            candidate(amount = 4321),
            "recovery-key-2",
        )
        val firstReservation = harness.repository.beginAcceptance(first.candidateId)
        harness.repository.beginAcceptance(second.candidateId)

        val recovery = harness.repository.recoverAccepting(
            setOf(firstReservation.reservedTransactionId),
        )

        assertEquals(setOf(first.candidateId), recovery.completedCandidateIds)
        assertEquals(
            setOf(second.candidateId),
            recovery.returnedToPendingCandidateIds,
        )
        val entities = harness.repository.entitiesForActiveOwner()
            .associateBy { it.id }
        assertEquals(
            CandidateStatus.ACCEPTED.storageValue,
            entities.getValue(first.candidateId).status,
        )
        assertEquals(
            CandidateStatus.PENDING.storageValue,
            entities.getValue(second.candidateId).status,
        )
        assertNull(entities.getValue(first.candidateId).payloadCiphertext)
    }

    @Test
    fun ownerPartitionRejectsCandidateFromAnotherOwner() {
        val harness = harness("owner_partition")
        val created = harness.repository.persist(candidate(), "owner-key")
        harness.privacyStore.registerOwner("firebase-owner-b")

        try {
            harness.repository.get(created.candidateId)
            throw AssertionError("Prior-owner candidate must not be visible.")
        } catch (_: CandidateNotFoundException) {
            // Expected.
        }
    }

    @Test
    fun privacyPurgeClosesAndDeletesTheFileBackedDatabase() {
        val namespace = "candidate_purge_${System.nanoTime()}"
        val privacyStore = PaymentDetectionPrivacyStore(context, namespace = namespace)
        stores += privacyStore
        privacyStore.registerOwner("firebase-purge-owner")
        val database = PaymentCandidateDatabaseProvider.get(
            context,
            privacyStore.candidateDatabaseName,
        )
        val repository = PaymentCandidateRepository(
            context = context,
            privacyStore = privacyStore,
            databaseName = privacyStore.candidateDatabaseName,
            database = database,
        )
        repository.persist(candidate(), "purge-key")
        assertTrue(context.getDatabasePath(privacyStore.candidateDatabaseName).exists())

        privacyStore.purge(NativePurgeReason.LOCAL_RESET)

        assertFalse(privacyStore.hasActiveOwner())
        assertFalse(context.getDatabasePath(privacyStore.candidateDatabaseName).exists())
    }

    @Test
    fun encryptionKeyInvalidationPurgesUnreadableCandidatePayloads() {
        val harness = harness("key_invalidation")
        harness.repository.persist(candidate(), "key-invalidation-notification")

        CandidateFieldProtector().deleteKey()

        assertThrows(CandidatePayloadUnavailableException::class.java) {
            harness.repository.listPending()
        }
        assertEquals(0, harness.repository.countForActiveOwner())

        val recreated = harness.repository.persist(
            candidate(amount = 4321),
            "key-after-invalidation",
        )
        assertTrue(recreated is CandidatePersistenceResult.Created)
        assertEquals(4321L, harness.repository.get(recreated.candidateId).payload.amountMinorUnits)
    }

    @Test
    fun closedDatabaseFailsWithoutSilentlyRecreatingOrMutatingStorage() {
        val harness = harness("closed_database")
        harness.repository.persist(candidate(), "database-error-notification")
        harness.database.close()

        assertThrows(SQLException::class.java) {
            harness.repository.listPending()
        }
    }

    private fun harness(testName: String): Harness {
        val namespace = "candidate_${testName}_${System.nanoTime()}"
        val privacyStore = PaymentDetectionPrivacyStore(context, namespace = namespace)
        stores += privacyStore
        privacyStore.registerOwner("firebase-owner-a")
        val database = Room.inMemoryDatabaseBuilder(
            context,
            PaymentCandidateDatabase::class.java,
        )
            .allowMainThreadQueries()
            .build()
        databases += database
        val clock = MutableClock(1_754_000_000_000L)
        val repository = PaymentCandidateRepository(
            context = context,
            privacyStore = privacyStore,
            databaseName = privacyStore.candidateDatabaseName,
            database = database,
            now = clock::now,
        )
        return Harness(repository, privacyStore, clock, database)
    }

    private fun candidate(
        source: String = "aura-synthetic-source",
        amount: Long = 1234,
        merchant: String? = "Negozio di prova",
    ) = PaymentDetectionResult.Candidate(
        tier = PaymentMatchTier.EXACT,
        sourceAppId = source,
        operationType = "card_payment",
        amountMinorUnits = amount,
        currency = "EUR",
        merchant = merchant,
        occurredAtEpochMillis = 1_754_000_000_000L,
        matchedRuleId = "synthetic-wallet-card-payment-v1",
        ruleVersion = "synthetic-wallet-v1",
    )

    private data class Harness(
        val repository: PaymentCandidateRepository,
        val privacyStore: PaymentDetectionPrivacyStore,
        val clock: MutableClock,
        val database: PaymentCandidateDatabase,
    )

    private class MutableClock(var value: Long) {
        fun now(): Long = value
    }
}
