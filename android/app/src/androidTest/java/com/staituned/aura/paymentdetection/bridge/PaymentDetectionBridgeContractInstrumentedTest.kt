package com.staituned.aura.paymentdetection.bridge

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.getcapacitor.JSArray
import com.staituned.aura.paymentdetection.data.AcceptanceReservation
import com.staituned.aura.paymentdetection.data.CandidatePayload
import com.staituned.aura.paymentdetection.data.CandidateStatus
import com.staituned.aura.paymentdetection.data.PaymentCandidateRecord
import com.staituned.aura.paymentdetection.domain.PaymentMatchTier
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class PaymentDetectionBridgeContractInstrumentedTest {
    private val mapper = PaymentDetectionBridgeMapper()

    @Test
    fun candidateDtoContainsOnlyMinimizedReviewFields() {
        val json = mapper.candidate(candidate())

        assertEquals("AbCdEfGhIjKlMnOpQrStUvWx", json.getString("id"))
        assertEquals(1234L, json.getLong("amountMinorUnits"))
        assertEquals("EUR", json.getString("currency"))
        assertEquals("Negozio di prova", json.getString("merchant"))
        assertEquals(
            "aura-synthetic-source",
            checkNotNull(json.getJSObject("sourceApp")).getString("id"),
        )
        for (
            forbidden in listOf(
                "title",
                "text",
                "bigText",
                "matchedRuleId",
                "ruleVersion",
                "technicalFingerprint",
                "semanticFingerprint",
                "acceptanceToken",
                "reservedTransactionId",
            )
        ) {
            assertFalse(json.has(forbidden))
        }
    }

    @Test
    fun acceptanceSecretsAppearOnlyInTheBeginResponse() {
        val response = mapper.reservation(
            AcceptanceReservation(
                candidate = candidate().copy(status = CandidateStatus.ACCEPTING),
                acceptanceToken = "A".repeat(43),
                reservedTransactionId = "123e4567-e89b-42d3-a456-426614174000",
            ),
        )

        assertTrue(response.has("acceptanceToken"))
        assertTrue(response.has("reservedTransactionId"))
        assertFalse(
            checkNotNull(response.getJSObject("candidate")).has("acceptanceToken"),
        )
    }

    @Test
    fun bridgeValidatorRejectsSpoofedIdsTokensAndRecoveryPayloads() {
        assertEquals(
            "AbCdEfGhIjKlMnOpQrStUvWx",
            PaymentDetectionBridgeValidator.requireCandidateId(
                "AbCdEfGhIjKlMnOpQrStUvWx",
            ),
        )
        assertThrows(IllegalArgumentException::class.java) {
            PaymentDetectionBridgeValidator.requireCandidateId("short")
        }
        assertThrows(IllegalArgumentException::class.java) {
            PaymentDetectionBridgeValidator.requireAcceptanceToken("token")
        }
        assertThrows(IllegalArgumentException::class.java) {
            PaymentDetectionBridgeValidator.requireTransactionIds(
                JSArray(listOf("not-a-transaction-id")),
            )
        }
        assertEquals(
            setOf("123e4567-e89b-42d3-a456-426614174000"),
            PaymentDetectionBridgeValidator.requireTransactionIds(
                JSArray(listOf("123e4567-e89b-42d3-a456-426614174000")),
            ),
        )
    }

    private fun candidate() = PaymentCandidateRecord(
        id = "AbCdEfGhIjKlMnOpQrStUvWx",
        sourceAppId = "aura-synthetic-source",
        payload = CandidatePayload(
            operationType = "card_payment",
            amountMinorUnits = 1234,
            currency = "EUR",
            merchant = "Negozio di prova",
            occurredAtEpochMillis = 1_754_000_000_000L,
        ),
        detectedAt = 1_754_000_000_100L,
        matchTier = PaymentMatchTier.EXACT,
        status = CandidateStatus.PENDING,
        expiresAt = 1_755_209_600_100L,
    )
}
