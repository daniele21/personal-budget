package com.staituned.aura.paymentdetection.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update

@Dao
internal interface PaymentCandidateDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    fun insert(entity: PaymentCandidateEntity): Long

    @Update
    fun update(entity: PaymentCandidateEntity): Int

    @Query(
        """
        SELECT * FROM payment_candidates
        WHERE ownerKeyHash = :ownerKeyHash
          AND technicalFingerprint = :technicalFingerprint
        LIMIT 1
        """,
    )
    fun findByTechnicalFingerprint(
        ownerKeyHash: String,
        technicalFingerprint: String,
    ): PaymentCandidateEntity?

    @Query(
        """
        SELECT * FROM payment_candidates
        WHERE ownerKeyHash = :ownerKeyHash
          AND semanticFingerprint = :semanticFingerprint
          AND sourceAppId != :sourceAppId
          AND status IN ('pending', 'accepting', 'accepted', 'edited', 'ignored')
          AND detectedAt BETWEEN :fromDetectedAt AND :toDetectedAt
        ORDER BY detectedAt DESC
        LIMIT 1
        """,
    )
    fun findCrossSourceSemanticDuplicate(
        ownerKeyHash: String,
        semanticFingerprint: String,
        sourceAppId: String,
        fromDetectedAt: Long,
        toDetectedAt: Long,
    ): PaymentCandidateEntity?

    @Query(
        """
        SELECT * FROM payment_candidates
        WHERE ownerKeyHash = :ownerKeyHash AND id = :candidateId
        LIMIT 1
        """,
    )
    fun findByIdForOwner(
        ownerKeyHash: String,
        candidateId: String,
    ): PaymentCandidateEntity?

    @Query(
        """
        SELECT * FROM payment_candidates
        WHERE ownerKeyHash = :ownerKeyHash AND status = 'pending'
        ORDER BY detectedAt DESC
        """,
    )
    fun listPending(ownerKeyHash: String): List<PaymentCandidateEntity>

    @Query(
        """
        SELECT * FROM payment_candidates
        WHERE ownerKeyHash = :ownerKeyHash AND status = 'accepting'
        ORDER BY updatedAt ASC
        """,
    )
    fun listAccepting(ownerKeyHash: String): List<PaymentCandidateEntity>

    @Query(
        """
        UPDATE payment_candidates
        SET status = 'expired',
            payloadCiphertext = NULL,
            payloadNonce = NULL,
            acceptanceTokenHash = NULL,
            reservedTransactionId = NULL,
            updatedAt = :now
        WHERE ownerKeyHash = :ownerKeyHash
          AND status = 'pending'
          AND expiresAt <= :now
        """,
    )
    fun expirePending(ownerKeyHash: String, now: Long): Int

    @Query(
        """
        DELETE FROM payment_candidates
        WHERE ownerKeyHash = :ownerKeyHash
          AND status IN ('expired', 'accepted', 'edited', 'ignored')
          AND expiresAt <= :now
        """,
    )
    fun deleteExpiredTombstones(ownerKeyHash: String, now: Long): Int

    @Query("DELETE FROM payment_candidates WHERE ownerKeyHash = :ownerKeyHash")
    fun deleteAllForOwner(ownerKeyHash: String): Int

    @Query("DELETE FROM payment_candidates")
    fun deleteAll(): Int

    @Query(
        "SELECT COUNT(*) FROM payment_candidates WHERE ownerKeyHash = :ownerKeyHash",
    )
    fun countForOwner(ownerKeyHash: String): Int

    @Query(
        """
        SELECT * FROM payment_candidates
        WHERE ownerKeyHash = :ownerKeyHash
        ORDER BY detectedAt ASC
        """,
    )
    fun listAllForOwner(ownerKeyHash: String): List<PaymentCandidateEntity>
}
