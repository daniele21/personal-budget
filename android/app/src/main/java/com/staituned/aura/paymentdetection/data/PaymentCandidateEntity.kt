package com.staituned.aura.paymentdetection.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

internal enum class CandidateStatus(val storageValue: String) {
    PENDING("pending"),
    ACCEPTING("accepting"),
    ACCEPTED("accepted"),
    EDITED("edited"),
    IGNORED("ignored"),
    EXPIRED("expired"),
}

@Entity(
    tableName = "payment_candidates",
    indices = [
        Index(
            name = "index_candidates_owner_technical",
            value = ["ownerKeyHash", "technicalFingerprint"],
            unique = true,
        ),
        Index(
            name = "index_candidates_owner_semantic_status_detected",
            value = [
                "ownerKeyHash",
                "semanticFingerprint",
                "status",
                "detectedAt",
            ],
        ),
        Index(
            name = "index_candidates_owner_status_expiry",
            value = ["ownerKeyHash", "status", "expiresAt"],
        ),
    ],
)
internal data class PaymentCandidateEntity(
    @PrimaryKey
    val id: String,
    val schemaVersion: Int,
    val ownerKeyHash: String,
    val sourceAppId: String,
    val payloadCiphertext: ByteArray?,
    val payloadNonce: ByteArray?,
    val detectedAt: Long,
    val matchTier: String,
    val matchedRuleId: String?,
    val ruleVersion: String,
    val technicalFingerprint: String,
    val semanticFingerprint: String?,
    val status: String,
    val acceptanceTokenHash: String?,
    val reservedTransactionId: String?,
    val updatedAt: Long,
    val expiresAt: Long,
)
