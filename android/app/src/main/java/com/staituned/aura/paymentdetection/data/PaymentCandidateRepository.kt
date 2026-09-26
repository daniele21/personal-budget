package com.staituned.aura.paymentdetection.data

import android.content.Context
import com.staituned.aura.paymentdetection.domain.PaymentDetectionResult
import com.staituned.aura.paymentdetection.domain.PaymentMatchTier
import com.staituned.aura.paymentdetection.security.AcceptanceTokenFactory
import com.staituned.aura.paymentdetection.security.CandidateAuthenticationException
import com.staituned.aura.paymentdetection.security.CandidateFieldProtector
import com.staituned.aura.paymentdetection.security.CandidateFingerprintHasher
import com.staituned.aura.paymentdetection.security.CandidateKeyUnavailableException
import com.staituned.aura.paymentdetection.security.ProtectedCandidateField
import com.staituned.aura.paymentdetection.security.SecureOpaqueId
import java.util.UUID
import java.util.concurrent.Callable

internal sealed interface CandidatePersistenceResult {
    val candidateId: String

    data class Created(
        override val candidateId: String,
        val tier: PaymentMatchTier,
    ) : CandidatePersistenceResult

    data class Updated(
        override val candidateId: String,
        val tier: PaymentMatchTier,
    ) : CandidatePersistenceResult

    data class Duplicate(
        override val candidateId: String,
    ) : CandidatePersistenceResult
}

internal data class PaymentCandidateRecord(
    val id: String,
    val sourceAppId: String,
    val payload: CandidatePayload,
    val detectedAt: Long,
    val matchTier: PaymentMatchTier,
    val status: CandidateStatus,
    val expiresAt: Long,
)

internal data class AcceptanceReservation(
    val candidate: PaymentCandidateRecord,
    val acceptanceToken: String,
    val reservedTransactionId: String,
)

internal data class AcceptanceRecoveryResult(
    val completedCandidateIds: Set<String>,
    val returnedToPendingCandidateIds: Set<String>,
)

internal class CandidateNotFoundException : IllegalStateException()
internal class CandidateStateException : IllegalStateException()
internal class CandidateTokenException : SecurityException()
internal class CandidatePayloadUnavailableException : SecurityException()

internal class PaymentCandidateRepository(
    context: Context,
    private val privacyStore: PaymentDetectionPrivacyStore =
        PaymentDetectionPrivacyStore(context),
    private val databaseName: String =
        PaymentCandidateDatabase.DEFAULT_DATABASE_NAME,
    database: PaymentCandidateDatabase? = null,
    private val fieldProtector: CandidateFieldProtector = CandidateFieldProtector(),
    private val fingerprintHasher: CandidateFingerprintHasher =
        CandidateFingerprintHasher(),
    private val tokenFactory: AcceptanceTokenFactory = AcceptanceTokenFactory(),
    private val now: () -> Long = System::currentTimeMillis,
) {
    /**
     * Production repositories must not retain a Room instance across owner purge.
     * Logout/reset closes and deletes the provider database while long-lived
     * listener/plugin objects can remain alive. Resolve the provider database on
     * every operation so the next callback can reopen a fresh instance.
     *
     * Tests may inject a fixed database to preserve explicit closed-database
     * failure coverage.
     */
    private val applicationContext = context.applicationContext
    private val fixedDatabase = database

    private fun openDatabase(): PaymentCandidateDatabase =
        fixedDatabase ?: PaymentCandidateDatabaseProvider.get(
            applicationContext,
            databaseName,
        )

    private inline fun <T> withActiveOwnerDatabase(
        expectedOwnerKeyHash: String = privacyStore.requireActiveOwnerHash(),
        block: (
            database: PaymentCandidateDatabase,
            dao: PaymentCandidateDao,
            ownerKeyHash: String,
        ) -> T,
    ): T {
        val database = openDatabase()
        val dao = database.candidateDao()
        check(privacyStore.requireActiveOwnerHash() == expectedOwnerKeyHash) {
            "Native payment owner changed during database operation."
        }
        return block(database, dao, expectedOwnerKeyHash)
    }

    fun persist(
        candidate: PaymentDetectionResult.Candidate,
        notificationKey: String,
        detectedAt: Long = now(),
    ): CandidatePersistenceResult {
        require(notificationKey.isNotBlank() && notificationKey.length <= MAX_NOTIFICATION_KEY)
        require(candidate.tier == PaymentMatchTier.EXACT || candidate.tier == PaymentMatchTier.REVIEW)
        val ownerKeyHash = privacyStore.requireActiveOwnerHash()
        val technicalFingerprint = fingerprintHasher.hashTechnical(
            ownerKeyHash = ownerKeyHash,
            sourceAppId = candidate.sourceAppId,
            notificationKey = notificationKey,
        )
        val semanticFingerprint = candidate.merchant?.let {
            fingerprintHasher.hashSemantic(
                ownerKeyHash = ownerKeyHash,
                operationType = candidate.operationType,
                amountMinorUnits = candidate.amountMinorUnits,
                currency = candidate.currency,
                merchant = it,
            )
        }
        val payload = CandidatePayload(
            operationType = candidate.operationType,
            amountMinorUnits = candidate.amountMinorUnits,
            currency = candidate.currency,
            merchant = candidate.merchant,
            occurredAtEpochMillis = candidate.occurredAtEpochMillis,
        )

        return withActiveOwnerDatabase(ownerKeyHash) { database, dao, activeOwnerKeyHash ->
            cleanup(database, dao, activeOwnerKeyHash, detectedAt)
            database.runInTransaction(
                Callable {
                    val technicalMatch = dao.findByTechnicalFingerprint(
                    activeOwnerKeyHash,
                    technicalFingerprint,
                )
                if (technicalMatch != null) {
                    if (technicalMatch.status != CandidateStatus.PENDING.storageValue) {
                        return@Callable CandidatePersistenceResult.Duplicate(
                            technicalMatch.id,
                        )
                    }
                    val protectedPayload = protect(
                        payload = payload,
                        candidateId = technicalMatch.id,
                        ownerKeyHash = activeOwnerKeyHash,
                    )
                    val updated = technicalMatch.copy(
                        sourceAppId = candidate.sourceAppId,
                        payloadCiphertext = protectedPayload.ciphertext,
                        payloadNonce = protectedPayload.nonce,
                        detectedAt = detectedAt,
                        matchTier = candidate.tier.storageValue(),
                        matchedRuleId = candidate.matchedRuleId,
                        ruleVersion = candidate.ruleVersion,
                        semanticFingerprint = semanticFingerprint,
                        updatedAt = detectedAt,
                        expiresAt = safeAdd(detectedAt, PENDING_RETENTION_MS),
                    )
                    check(dao.update(updated) == 1)
                    return@Callable CandidatePersistenceResult.Updated(
                        technicalMatch.id,
                        candidate.tier,
                    )
                }

                if (semanticFingerprint != null) {
                    val semanticMatch = dao.findCrossSourceSemanticDuplicate(
                        ownerKeyHash = activeOwnerKeyHash,
                        semanticFingerprint = semanticFingerprint,
                        sourceAppId = candidate.sourceAppId,
                        fromDetectedAt = (detectedAt - SEMANTIC_DEDUPE_WINDOW_MS)
                            .coerceAtLeast(0),
                        toDetectedAt = safeAdd(
                            detectedAt,
                            SEMANTIC_DEDUPE_WINDOW_MS,
                        ),
                    )
                    if (semanticMatch != null) {
                        return@Callable CandidatePersistenceResult.Duplicate(
                            semanticMatch.id,
                        )
                    }
                }

                val id = SecureOpaqueId.create()
                    val protectedPayload = protect(payload, id, activeOwnerKeyHash)
                val entity = PaymentCandidateEntity(
                    id = id,
                    schemaVersion = PaymentCandidateDatabase.SCHEMA_VERSION,
                    ownerKeyHash = activeOwnerKeyHash,
                    sourceAppId = candidate.sourceAppId,
                    payloadCiphertext = protectedPayload.ciphertext,
                    payloadNonce = protectedPayload.nonce,
                    detectedAt = detectedAt,
                    matchTier = candidate.tier.storageValue(),
                    matchedRuleId = candidate.matchedRuleId,
                    ruleVersion = candidate.ruleVersion,
                    technicalFingerprint = technicalFingerprint,
                    semanticFingerprint = semanticFingerprint,
                    status = CandidateStatus.PENDING.storageValue,
                    acceptanceTokenHash = null,
                    reservedTransactionId = null,
                    updatedAt = detectedAt,
                    expiresAt = safeAdd(detectedAt, PENDING_RETENTION_MS),
                )
                if (dao.insert(entity) == INSERT_CONFLICT) {
                    val duplicate = checkNotNull(
                        dao.findByTechnicalFingerprint(
                            activeOwnerKeyHash,
                            technicalFingerprint,
                        ),
                    )
                    CandidatePersistenceResult.Duplicate(duplicate.id)
                } else {
                    CandidatePersistenceResult.Created(id, candidate.tier)
                }
            },
            )
        }
    }

    fun listPending(): List<PaymentCandidateRecord> {
        val ownerKeyHash = privacyStore.requireActiveOwnerHash()
        return withActiveOwnerDatabase(ownerKeyHash) { database, dao, activeOwnerKeyHash ->
            cleanup(database, dao, activeOwnerKeyHash, now())
            withPayloadFailurePurge(activeOwnerKeyHash, dao) {
                dao.listPending(activeOwnerKeyHash).map {
                    it.toRecord(activeOwnerKeyHash)
                }
            }
        }
    }

    fun get(candidateId: String): PaymentCandidateRecord {
        val ownerKeyHash = privacyStore.requireActiveOwnerHash()
        return withActiveOwnerDatabase(ownerKeyHash) { database, dao, activeOwnerKeyHash ->
            cleanup(database, dao, activeOwnerKeyHash, now())
            val entity = dao.findByIdForOwner(activeOwnerKeyHash, candidateId)
                ?: throw CandidateNotFoundException()
            withPayloadFailurePurge(activeOwnerKeyHash, dao) {
                entity.toRecord(activeOwnerKeyHash)
            }
        }
    }

    fun ignore(candidateId: String) {
        val ownerKeyHash = privacyStore.requireActiveOwnerHash()
        val timestamp = now()
        withActiveOwnerDatabase(ownerKeyHash) { database, dao, activeOwnerKeyHash ->
            cleanup(database, dao, activeOwnerKeyHash, timestamp)
            database.runInTransaction {
                val entity = dao.findByIdForOwner(
                    activeOwnerKeyHash,
                    candidateId,
                ) ?: throw CandidateNotFoundException()
                if (entity.status != CandidateStatus.PENDING.storageValue) {
                    throw CandidateStateException()
                }
                check(
                    dao.update(
                        entity.toTombstone(
                            status = CandidateStatus.IGNORED,
                            updatedAt = timestamp,
                            expiresAt = safeAdd(timestamp, IGNORED_RETENTION_MS),
                        ),
                    ) == 1,
                )
            }
        }
    }

    fun beginAcceptance(candidateId: String): AcceptanceReservation {
        val ownerKeyHash = privacyStore.requireActiveOwnerHash()
        return withActiveOwnerDatabase(ownerKeyHash) { database, dao, activeOwnerKeyHash ->
            cleanup(database, dao, activeOwnerKeyHash, now())
            try {
                database.runInTransaction(
                    Callable {
                        val entity = dao.findByIdForOwner(
                            activeOwnerKeyHash,
                            candidateId,
                        ) ?: throw CandidateNotFoundException()
                        val record = entity.toRecord(activeOwnerKeyHash)
                        when (entity.status) {
                        CandidateStatus.PENDING.storageValue -> {
                            val reservedTransactionId = UUID.randomUUID().toString()
                            val token = tokenFactory.create(
                                activeOwnerKeyHash,
                                entity.id,
                                reservedTransactionId,
                            )
                            val updated = entity.copy(
                                status = CandidateStatus.ACCEPTING.storageValue,
                                acceptanceTokenHash = tokenFactory.hash(token),
                                reservedTransactionId = reservedTransactionId,
                                updatedAt = now(),
                            )
                            check(dao.update(updated) == 1)
                            AcceptanceReservation(
                                candidate = record.copy(
                                    status = CandidateStatus.ACCEPTING,
                                ),
                                acceptanceToken = token,
                                reservedTransactionId = reservedTransactionId,
                            )
                        }
                        CandidateStatus.ACCEPTING.storageValue -> {
                            val reservedTransactionId =
                                entity.reservedTransactionId
                                    ?: throw CandidateStateException()
                            val expectedHash =
                                entity.acceptanceTokenHash
                                    ?: throw CandidateStateException()
                            val token = tokenFactory.create(
                                activeOwnerKeyHash,
                                entity.id,
                                reservedTransactionId,
                            )
                            if (!tokenFactory.matches(token, expectedHash)) {
                                throw CandidateStateException()
                            }
                            AcceptanceReservation(
                                candidate = record,
                                acceptanceToken = token,
                                reservedTransactionId = reservedTransactionId,
                            )
                        }
                            else -> throw CandidateStateException()
                        }
                    },
                )
            } catch (error: CandidatePayloadUnavailableException) {
                dao.deleteAllForOwner(activeOwnerKeyHash)
                throw error
            }
        }
    }

    fun completeAcceptance(
        candidateId: String,
        acceptanceToken: String,
        edited: Boolean,
    ) {
        require(acceptanceToken.isNotBlank() && acceptanceToken.length <= MAX_TOKEN_LENGTH)
        val ownerKeyHash = privacyStore.requireActiveOwnerHash()
        val timestamp = now()
        withActiveOwnerDatabase(ownerKeyHash) { database, dao, activeOwnerKeyHash ->
            database.runInTransaction {
                val entity = dao.findByIdForOwner(
                    activeOwnerKeyHash,
                    candidateId,
                ) ?: throw CandidateNotFoundException()
                val expectedHash = entity.acceptanceTokenHash
                    ?: throw CandidateStateException()
                if (!tokenFactory.matches(acceptanceToken, expectedHash)) {
                    throw CandidateTokenException()
                }
                when (entity.status) {
                    CandidateStatus.ACCEPTING.storageValue -> {
                        val completedStatus =
                            if (edited) {
                                CandidateStatus.EDITED
                            } else {
                                CandidateStatus.ACCEPTED
                            }
                        check(
                            dao.update(
                                entity.toTombstone(
                                    status = completedStatus,
                                    updatedAt = timestamp,
                                    expiresAt = safeAdd(
                                        timestamp,
                                        ACCEPTED_RETENTION_MS,
                                    ),
                                    retainAcceptance = true,
                                ),
                            ) == 1,
                        )
                    }
                    CandidateStatus.ACCEPTED.storageValue,
                    CandidateStatus.EDITED.storageValue,
                    -> Unit
                    else -> throw CandidateStateException()
                }
            }
        }
    }

    fun recoverAccepting(
        verifiedTransactionIds: Set<String>,
    ): AcceptanceRecoveryResult {
        val ownerKeyHash = privacyStore.requireActiveOwnerHash()
        val timestamp = now()
        return withActiveOwnerDatabase(ownerKeyHash) { database, dao, activeOwnerKeyHash ->
            database.runInTransaction(
                Callable {
                    val completed = mutableSetOf<String>()
                    val returned = mutableSetOf<String>()
                    dao.listAccepting(activeOwnerKeyHash).forEach { entity ->
                        val reservedId = entity.reservedTransactionId
                    if (reservedId != null && reservedId in verifiedTransactionIds) {
                        check(
                            dao.update(
                                entity.toTombstone(
                                    status = CandidateStatus.ACCEPTED,
                                    updatedAt = timestamp,
                                    expiresAt = safeAdd(
                                        timestamp,
                                        ACCEPTED_RETENTION_MS,
                                    ),
                                    retainAcceptance = true,
                                ),
                            ) == 1,
                        )
                        completed += entity.id
                    } else {
                        check(
                            dao.update(
                                entity.copy(
                                    status = CandidateStatus.PENDING.storageValue,
                                    acceptanceTokenHash = null,
                                    reservedTransactionId = null,
                                    updatedAt = timestamp,
                                    expiresAt = safeAdd(
                                        timestamp,
                                        PENDING_RETENTION_MS,
                                    ),
                                ),
                            ) == 1,
                        )
                        returned += entity.id
                    }
                    }
                    AcceptanceRecoveryResult(completed, returned)
                },
            )
        }
    }

    fun cleanup() {
        val ownerKeyHash = privacyStore.requireActiveOwnerHash()
        withActiveOwnerDatabase(ownerKeyHash) { database, dao, activeOwnerKeyHash ->
            cleanup(database, dao, activeOwnerKeyHash, now())
        }
    }

    fun deleteAllForOwner(): Int {
        val ownerKeyHash = privacyStore.requireActiveOwnerHash()
        return withActiveOwnerDatabase(ownerKeyHash) { _, dao, activeOwnerKeyHash ->
            dao.deleteAllForOwner(activeOwnerKeyHash)
        }
    }

    internal fun countForActiveOwner(): Int {
        val ownerKeyHash = privacyStore.requireActiveOwnerHash()
        return withActiveOwnerDatabase(ownerKeyHash) { _, dao, activeOwnerKeyHash ->
            dao.countForOwner(activeOwnerKeyHash)
        }
    }

    internal fun entitiesForActiveOwner(): List<PaymentCandidateEntity> {
        val ownerKeyHash = privacyStore.requireActiveOwnerHash()
        return withActiveOwnerDatabase(ownerKeyHash) { _, dao, activeOwnerKeyHash ->
            dao.listAllForOwner(activeOwnerKeyHash)
        }
    }

    private fun cleanup(
        database: PaymentCandidateDatabase,
        dao: PaymentCandidateDao,
        ownerKeyHash: String,
        timestamp: Long,
    ) {
        database.runInTransaction {
            dao.expirePending(ownerKeyHash, timestamp)
            dao.deleteExpiredTombstones(ownerKeyHash, timestamp)
        }
    }

    private fun protect(
        payload: CandidatePayload,
        candidateId: String,
        ownerKeyHash: String,
    ): ProtectedCandidateField =
        fieldProtector.protect(
            plaintext = CandidatePayloadCodec.encode(payload),
            candidateId = candidateId,
            ownerKeyHash = ownerKeyHash,
            schemaVersion = PaymentCandidateDatabase.SCHEMA_VERSION,
        )

    private fun PaymentCandidateEntity.toRecord(
        activeOwnerKeyHash: String,
    ): PaymentCandidateRecord {
        if (ownerKeyHash != activeOwnerKeyHash) throw CandidateNotFoundException()
        val ciphertext = payloadCiphertext ?: throw CandidateStateException()
        val nonce = payloadNonce ?: throw CandidateStateException()
        val payload = try {
            CandidatePayloadCodec.decode(
                fieldProtector.unprotect(
                    protectedField = ProtectedCandidateField(ciphertext, nonce),
                    candidateId = id,
                    ownerKeyHash = ownerKeyHash,
                    schemaVersion = schemaVersion,
                ),
            )
        } catch (_: CandidateAuthenticationException) {
            throw CandidatePayloadUnavailableException()
        } catch (_: CandidateKeyUnavailableException) {
            throw CandidatePayloadUnavailableException()
        } catch (_: IllegalArgumentException) {
            throw CandidatePayloadUnavailableException()
        }
        return PaymentCandidateRecord(
            id = id,
            sourceAppId = sourceAppId,
            payload = payload,
            detectedAt = detectedAt,
            matchTier = PaymentMatchTier.valueOf(matchTier.uppercase()),
            status = CandidateStatus.entries.firstOrNull {
                it.storageValue == status
            } ?: throw CandidateStateException(),
            expiresAt = expiresAt,
        )
    }

    private fun PaymentCandidateEntity.toTombstone(
        status: CandidateStatus,
        updatedAt: Long,
        expiresAt: Long,
        retainAcceptance: Boolean = false,
    ): PaymentCandidateEntity =
        copy(
            payloadCiphertext = null,
            payloadNonce = null,
            status = status.storageValue,
            acceptanceTokenHash =
                if (retainAcceptance) acceptanceTokenHash else null,
            reservedTransactionId =
                if (retainAcceptance) reservedTransactionId else null,
            updatedAt = updatedAt,
            expiresAt = expiresAt,
        )

    private inline fun <T> withPayloadFailurePurge(
        ownerKeyHash: String,
        dao: PaymentCandidateDao,
        block: () -> T,
    ): T =
        try {
            block()
        } catch (error: CandidatePayloadUnavailableException) {
            dao.deleteAllForOwner(ownerKeyHash)
            throw error
        }

    private fun PaymentMatchTier.storageValue(): String = name.lowercase()

    private fun safeAdd(value: Long, duration: Long): Long =
        if (value > Long.MAX_VALUE - duration) Long.MAX_VALUE else value + duration

    companion object {
        private const val MAX_NOTIFICATION_KEY = 512
        private const val MAX_TOKEN_LENGTH = 256
        private const val INSERT_CONFLICT = -1L
        internal const val SEMANTIC_DEDUPE_WINDOW_MS = 2 * 60 * 1000L
        internal const val PENDING_RETENTION_MS = 14 * 24 * 60 * 60 * 1000L
        internal const val IGNORED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000L
        internal const val ACCEPTED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000L
    }
}
