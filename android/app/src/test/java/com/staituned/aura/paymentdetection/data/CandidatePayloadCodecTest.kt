package com.staituned.aura.paymentdetection.data

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class CandidatePayloadCodecTest {
    @Test
    fun roundTripPreservesOnlyTheStructuredCandidateFields() {
        val payload = CandidatePayload(
            operationType = "card_payment",
            amountMinorUnits = 1234,
            currency = "EUR",
            merchant = "Negozio di prova",
            occurredAtEpochMillis = 1_754_000_000_000L,
        )

        assertEquals(payload, CandidatePayloadCodec.decode(CandidatePayloadCodec.encode(payload)))
    }

    @Test
    fun nullableMerchantRoundTripsWithoutSentinelText() {
        val payload = validPayload(merchant = null)

        assertEquals(payload, CandidatePayloadCodec.decode(CandidatePayloadCodec.encode(payload)))
    }

    @Test
    fun corruptHeaderAndTrailingDataAreRejected() {
        val encoded = CandidatePayloadCodec.encode(validPayload())
        val corruptHeader = encoded.copyOf().also { it[0] = (it[0].toInt() xor 0x7f).toByte() }
        val truncated = encoded.copyOf(encoded.size - 1)
        val trailingData = encoded + byteArrayOf(0x01)

        assertThrows(IllegalArgumentException::class.java) {
            CandidatePayloadCodec.decode(corruptHeader)
        }
        assertThrows(IllegalArgumentException::class.java) {
            CandidatePayloadCodec.decode(trailingData)
        }
        assertThrows(IllegalArgumentException::class.java) {
            CandidatePayloadCodec.decode(truncated)
        }
        assertArrayEquals(encoded, CandidatePayloadCodec.encode(validPayload()))
    }

    @Test
    fun invalidBusinessFieldsAreRejectedBeforeEncryption() {
        assertThrows(IllegalArgumentException::class.java) {
            CandidatePayloadCodec.encode(validPayload(amountMinorUnits = 0))
        }
        assertThrows(IllegalArgumentException::class.java) {
            CandidatePayloadCodec.encode(
                validPayload(amountMinorUnits = 9_007_199_254_740_992L),
            )
        }
        assertThrows(IllegalArgumentException::class.java) {
            CandidatePayloadCodec.encode(validPayload(currency = "eur"))
        }
        assertThrows(IllegalArgumentException::class.java) {
            CandidatePayloadCodec.encode(validPayload(operationType = ""))
        }
        assertThrows(IllegalArgumentException::class.java) {
            CandidatePayloadCodec.encode(validPayload(operationType = "transfer"))
        }
        assertThrows(IllegalArgumentException::class.java) {
            CandidatePayloadCodec.encode(validPayload(currency = "USD"))
        }
        assertThrows(IllegalArgumentException::class.java) {
            CandidatePayloadCodec.encode(validPayload(merchant = " "))
        }
    }

    private fun validPayload(
        operationType: String = "card_payment",
        amountMinorUnits: Long = 1234,
        currency: String = "EUR",
        merchant: String? = "Synthetic",
    ) = CandidatePayload(
        operationType = operationType,
        amountMinorUnits = amountMinorUnits,
        currency = currency,
        merchant = merchant,
        occurredAtEpochMillis = 1_754_000_000_000L,
    )
}
