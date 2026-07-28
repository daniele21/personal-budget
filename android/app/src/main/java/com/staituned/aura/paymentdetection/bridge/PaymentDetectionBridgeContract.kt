package com.staituned.aura.paymentdetection.bridge

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.staituned.aura.paymentdetection.data.AcceptanceRecoveryResult
import com.staituned.aura.paymentdetection.data.AcceptanceReservation
import com.staituned.aura.paymentdetection.data.PaymentCandidateRecord
import com.staituned.aura.paymentdetection.data.SupportedPaymentAppCatalog

internal object PaymentDetectionBridgeValidator {
    private val candidateIdPattern = Regex("^[A-Za-z0-9_-]{24}$")
    private val acceptanceTokenPattern = Regex("^[A-Za-z0-9_-]{43}$")
    private val transactionIdPattern = Regex(
        "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        RegexOption.IGNORE_CASE,
    )

    fun requireCandidateId(value: String?): String =
        requireNotNull(value).also {
            require(candidateIdPattern.matches(it))
        }

    fun requireAcceptanceToken(value: String?): String =
        requireNotNull(value).also {
            require(acceptanceTokenPattern.matches(it))
        }

    fun requireTransactionIds(value: JSArray?): Set<String> {
        requireNotNull(value)
        require(value.length() <= MAX_RECOVERY_TRANSACTION_IDS)
        return try {
            value.toList<String>().mapTo(mutableSetOf()) { transactionId ->
                require(transactionIdPattern.matches(transactionId))
                transactionId.lowercase()
            }
        } catch (error: RuntimeException) {
            throw IllegalArgumentException("Invalid recovery transaction IDs.", error)
        }
    }

    private const val MAX_RECOVERY_TRANSACTION_IDS = 10_000
}

internal class PaymentDetectionBridgeMapper {
    fun candidate(record: PaymentCandidateRecord): JSObject {
        val source = SupportedPaymentAppCatalog.findById(record.sourceAppId)
        return JSObject().apply {
            put("id", record.id)
            put("operationType", record.payload.operationType)
            put("amountMinorUnits", record.payload.amountMinorUnits)
            put("currency", record.payload.currency)
            record.payload.merchant?.let { put("merchant", it) }
            put("occurredAtEpochMillis", record.payload.occurredAtEpochMillis)
            put("detectedAtEpochMillis", record.detectedAt)
            put("matchTier", record.matchTier.name.lowercase())
            put("status", record.status.storageValue)
            put("expiresAtEpochMillis", record.expiresAt)
            put(
                "sourceApp",
                JSObject().apply {
                    put("id", source?.id ?: UNKNOWN_SOURCE_ID)
                    put("displayName", source?.displayName ?: UNKNOWN_SOURCE_NAME)
                },
            )
        }
    }

    fun reservation(reservation: AcceptanceReservation): JSObject =
        JSObject().apply {
            put("candidate", candidate(reservation.candidate))
            put("acceptanceToken", reservation.acceptanceToken)
            put("reservedTransactionId", reservation.reservedTransactionId)
        }

    fun recovery(result: AcceptanceRecoveryResult): JSObject =
        JSObject().apply {
            put("completedCandidateIds", JSArray(result.completedCandidateIds.sorted()))
            put(
                "returnedToPendingCandidateIds",
                JSArray(result.returnedToPendingCandidateIds.sorted()),
            )
        }

    companion object {
        private const val UNKNOWN_SOURCE_ID = "unknown"
        private const val UNKNOWN_SOURCE_NAME = "Unknown source"
    }
}
