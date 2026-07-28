package com.staituned.aura.paymentdetection.data

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.IOException

internal data class CandidatePayload(
    val operationType: String,
    val amountMinorUnits: Long,
    val currency: String,
    val merchant: String?,
    val occurredAtEpochMillis: Long,
)

internal object CandidatePayloadCodec {
    private const val MAGIC = 0x41555241
    private const val PAYLOAD_VERSION = 1
    private const val MAX_OPERATION_TYPE_CHARACTERS = 32
    private const val MAX_CURRENCY_CHARACTERS = 3
    private const val MAX_MERCHANT_CHARACTERS = 120

    fun encode(payload: CandidatePayload): ByteArray {
        validate(payload)
        val bytes = ByteArrayOutputStream()
        DataOutputStream(bytes).use { output ->
            output.writeInt(MAGIC)
            output.writeInt(PAYLOAD_VERSION)
            output.writeUTF(payload.operationType)
            output.writeLong(payload.amountMinorUnits)
            output.writeUTF(payload.currency)
            output.writeBoolean(payload.merchant != null)
            payload.merchant?.let(output::writeUTF)
            output.writeLong(payload.occurredAtEpochMillis)
        }
        return bytes.toByteArray()
    }

    fun decode(bytes: ByteArray): CandidatePayload {
        val payload = try {
            DataInputStream(ByteArrayInputStream(bytes)).use { input ->
                require(input.readInt() == MAGIC) { "Invalid candidate payload." }
                require(input.readInt() == PAYLOAD_VERSION) {
                    "Unsupported candidate payload."
                }
                CandidatePayload(
                    operationType = input.readUTF(),
                    amountMinorUnits = input.readLong(),
                    currency = input.readUTF(),
                    merchant = if (input.readBoolean()) input.readUTF() else null,
                    occurredAtEpochMillis = input.readLong(),
                ).also {
                    require(input.available() == 0) {
                        "Unexpected candidate payload data."
                    }
                }
            }
        } catch (error: IOException) {
            throw IllegalArgumentException("Invalid candidate payload.", error)
        }
        validate(payload)
        return payload
    }

    private fun validate(payload: CandidatePayload) {
        require(
            payload.operationType == CARD_PAYMENT &&
                payload.operationType.length <= MAX_OPERATION_TYPE_CHARACTERS,
        )
        require(payload.amountMinorUnits > 0)
        require(payload.currency == EUR && payload.currency.length == MAX_CURRENCY_CHARACTERS)
        require(
            payload.merchant == null ||
                (
                    payload.merchant.isNotBlank() &&
                        payload.merchant.length <= MAX_MERCHANT_CHARACTERS
                    ),
        )
        require(payload.occurredAtEpochMillis > 0)
    }

    private const val CARD_PAYMENT = "card_payment"
    private const val EUR = "EUR"
}
