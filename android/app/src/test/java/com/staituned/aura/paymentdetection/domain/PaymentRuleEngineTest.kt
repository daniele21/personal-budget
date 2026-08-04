package com.staituned.aura.paymentdetection.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.concurrent.TimeUnit

class PaymentRuleEngineTest {
    private val engine = PaymentRuleEngine()

    @Test
    fun syntheticCorpusMatchesExpectedTierAndStructuredFields() {
        corpus(
            resourceName = "/paymentdetection/synthetic-wallet-v1.fixture",
            sourceAppId = BundledPaymentRuleCatalog.SYNTHETIC_SOURCE_APP_ID,
        ).forEach { fixture ->
            val result = engine.evaluate(fixture.input())

            assertEquals(fixture.id, fixture.tier, result.tier)
            when (result) {
                is PaymentDetectionResult.Candidate -> {
                    assertEquals(fixture.id, fixture.minorUnits, result.amountMinorUnits)
                    assertEquals(fixture.id, fixture.merchant, result.merchant)
                    assertEquals(fixture.id, "EUR", result.currency)
                    assertEquals(fixture.id, POSTED_AT, result.occurredAtEpochMillis)
                }
                is PaymentDetectionResult.Ignored -> {
                    assertEquals(fixture.id, fixture.ignoredReason, result.reason)
                }
            }
        }
    }

    @Test
    fun redactedIntesaCorpusMatchesOnlyApprovedCardPayments() {
        corpus(
            resourceName = "/paymentdetection/intesa-sanpaolo-card-v1.fixture",
            sourceAppId = BundledPaymentRuleCatalog.INTESA_SANPAOLO_SOURCE_APP_ID,
        ).forEach { fixture ->
            val result = engine.evaluate(fixture.input())

            assertEquals(fixture.id, fixture.tier, result.tier)
            when (result) {
                is PaymentDetectionResult.Candidate -> {
                    assertEquals(fixture.id, fixture.minorUnits, result.amountMinorUnits)
                    assertEquals(fixture.id, fixture.merchant, result.merchant)
                    assertEquals(fixture.id, "EUR", result.currency)
                    assertEquals(fixture.id, POSTED_AT, result.occurredAtEpochMillis)
                }
                is PaymentDetectionResult.Ignored -> {
                    assertEquals(fixture.id, fixture.ignoredReason, result.reason)
                }
            }
        }
    }

    @Test
    fun intesaExpandedTextMatchesWithoutDependingOnNotificationTitle() {
        val result = engine.evaluate(
            PaymentDetectionInput(
                sourceAppId = BundledPaymentRuleCatalog.INTESA_SANPAOLO_SOURCE_APP_ID,
                title = null,
                text = null,
                bigText = "Hai pagato 15,40 € con la carta *0000 il 14.05 " +
                    "alle ore 16:20 da ESERCENTE DI PROVA.",
                postedAtEpochMillis = POSTED_AT,
            ),
        ) as PaymentDetectionResult.Candidate

        assertEquals(PaymentMatchTier.EXACT, result.tier)
        assertEquals(1540L, result.amountMinorUnits)
        assertEquals("ESERCENTE DI PROVA", result.merchant)
        assertTrue(result.merchant?.contains("0000") == false)
    }

    @Test
    fun redactedGoogleWalletCorpusMatchesOnlyApprovedCardPayments() {
        corpus(
            resourceName = "/paymentdetection/google-wallet-card-v1.fixture",
            sourceAppId = BundledPaymentRuleCatalog.GOOGLE_WALLET_SOURCE_APP_ID,
        ).forEach { fixture ->
            val result = engine.evaluate(fixture.input())

            assertEquals(fixture.id, fixture.tier, result.tier)
            when (result) {
                is PaymentDetectionResult.Candidate -> {
                    assertEquals(fixture.id, fixture.minorUnits, result.amountMinorUnits)
                    assertEquals(fixture.id, fixture.merchant, result.merchant)
                    assertEquals(fixture.id, "EUR", result.currency)
                    assertEquals(fixture.id, POSTED_AT, result.occurredAtEpochMillis)
                    assertTrue(fixture.id, result.merchant?.contains("0000") != true)
                }
                is PaymentDetectionResult.Ignored -> {
                    assertEquals(fixture.id, fixture.ignoredReason, result.reason)
                }
            }
        }
    }

    @Test
    fun redactedPayPalCorpusMatchesOnlyApprovedCompletedPurchases() {
        corpus(
            resourceName = "/paymentdetection/paypal-purchase-v1.fixture",
            sourceAppId = BundledPaymentRuleCatalog.PAYPAL_SOURCE_APP_ID,
        ).forEach { fixture ->
            val result = engine.evaluate(fixture.input())

            assertEquals(fixture.id, fixture.tier, result.tier)
            when (result) {
                is PaymentDetectionResult.Candidate -> {
                    assertEquals(fixture.id, fixture.minorUnits, result.amountMinorUnits)
                    assertEquals(fixture.id, fixture.merchant, result.merchant)
                    assertEquals(fixture.id, "EUR", result.currency)
                    assertEquals(fixture.id, POSTED_AT, result.occurredAtEpochMillis)
                }
                is PaymentDetectionResult.Ignored -> {
                    assertEquals(fixture.id, fixture.ignoredReason, result.reason)
                }
            }
        }
    }

    @Test
    fun negativeRulesAlwaysWinOverAnExactTemplate() {
        val result = engine.evaluate(
            input(
                title = "Pagamento annullato",
                text = "12,34 € presso Negozio di prova · Wallet simulato",
            ),
        )

        assertEquals(PaymentMatchTier.IGNORED, result.tier)
        assertEquals(
            PaymentIgnoredReason.NEGATIVE_SIGNAL,
            (result as PaymentDetectionResult.Ignored).reason,
        )
    }

    @Test
    fun unsupportedSourceIsIgnoredWithoutInspectingARealCatalog() {
        val result = engine.evaluate(
            input(
                sourceAppId = "unapproved-source",
                title = "Pagamento effettuato",
                text = "12,34 € presso Negozio di prova · Wallet simulato",
            ),
        )

        assertEquals(
            PaymentIgnoredReason.UNSUPPORTED_SOURCE,
            (result as PaymentDetectionResult.Ignored).reason,
        )
    }

    @Test
    fun malformedExactRuleIsDisabledWithoutDisablingSafeReviewRules() {
        val base = requireNotNull(
            BundledPaymentRuleCatalog.findBySourceAppId(
                BundledPaymentRuleCatalog.SYNTHETIC_SOURCE_APP_ID,
            ),
        )
        val malformed = ExactPaymentRuleDefinition(
            id = "malformed",
            titlePattern = "(",
            bodyPattern = "(.*)+",
        )
        val localEngine = PaymentRuleEngine(
            listOf(base.copy(exactRules = listOf(malformed) + base.exactRules)),
        )

        val result = localEngine.evaluate(
            input(
                title = "Pagamento effettuato",
                text = "12,34 € presso Negozio di prova · Wallet simulato",
            ),
        )

        assertEquals(PaymentMatchTier.EXACT, result.tier)
    }

    @Test
    fun rulePatternsRejectBackreferencesLookbehindAndNestedUnboundedQuantifiers() {
        assertTrue(BundledPaymentRuleCatalog.all().isNotEmpty())
        BundledPaymentRuleCatalog.all().forEach { rules ->
            rules.negativeRules.forEach {
                assertTrue(it.id, PaymentRegexSafety.isAllowed(it.pattern))
            }
            rules.exactRules.forEach {
                if (it.titlePattern != null) {
                    assertTrue(it.id, PaymentRegexSafety.isAllowed(it.titlePattern))
                }
                assertTrue(it.id, PaymentRegexSafety.isAllowed(it.bodyPattern))
            }
            assertTrue(
                rules.sourceAppId,
                PaymentRegexSafety.isAllowed(rules.reviewContextPattern),
            )
        }
        assertTrue(!PaymentRegexSafety.isAllowed("""(.*)+"""))
        assertTrue(!PaymentRegexSafety.isAllowed("""(?<=secret)value"""))
        assertTrue(!PaymentRegexSafety.isAllowed("""(value)\1"""))
    }

    @Test
    fun longAndHostileUnicodeInputIsBoundedAndDoesNotProduceCandidate() {
        val hostile = "\u0301".repeat(800) + "(a+)+"
        val result = engine.evaluate(
            input(
                title = hostile,
                text = hostile,
            ),
        )

        assertEquals(PaymentMatchTier.IGNORED, result.tier)
        assertEquals(512, NotificationNormalizer.normalize(hostile)?.length)
    }

    @Test
    fun candidateDoesNotExposeRawNotificationFields() {
        val result = engine.evaluate(
            input(
                title = "Pagamento effettuato",
                text = "12,34 € presso Negozio di prova · Wallet simulato",
            ),
        ) as PaymentDetectionResult.Candidate

        val fieldNames = result.javaClass.declaredFields.map { it.name }.toSet()
        assertTrue("title" !in fieldNames)
        assertTrue("text" !in fieldNames)
        assertTrue("bigText" !in fieldNames)
        assertNull(result.javaClass.declaredFields.firstOrNull { it.name == "rawContent" })
    }

    @Test
    fun cardOrAccountLikeMerchantValuesAreNeverExtracted() {
        val result = engine.evaluate(
            input(
                title = "Pagamento effettuato",
                text = "12,34 € presso Carta 1234 · Wallet simulato",
            ),
        ) as PaymentDetectionResult.Candidate

        assertEquals(PaymentMatchTier.EXACT, result.tier)
        assertNull(result.merchant)
    }

    @Test
    fun bundledRulesStayWithinTheParsingBudget() {
        val fixture = input(
            title = "Pagamento effettuato",
            text = "12,34 € presso Negozio di prova · Wallet simulato",
        )
        repeat(250) { engine.evaluate(fixture) }

        val startedAt = System.nanoTime()
        repeat(10_000) { engine.evaluate(fixture) }
        val elapsedMillis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt)

        assertTrue(
            "10,000 parses took ${elapsedMillis}ms; budget is 10,000ms.",
            elapsedMillis < 10_000,
        )
    }

    private fun corpus(
        resourceName: String,
        sourceAppId: String,
    ): List<Fixture> {
        val resource = requireNotNull(
            javaClass.getResourceAsStream(resourceName),
        )
        return resource.bufferedReader().useLines { lines ->
            lines
                .filter { it.isNotBlank() && !it.startsWith("#") }
                .map { line ->
                    val columns = line.split('|')
                    require(columns.size == 7) { "Invalid fixture row." }
                    Fixture(
                        id = columns[0],
                        tier = PaymentMatchTier.valueOf(columns[1]),
                        title = columns[2].ifEmpty { null },
                        text = columns[3].ifEmpty { null },
                        minorUnits = columns[4].toLongOrNull(),
                        merchant = columns[5].ifEmpty { null },
                        ignoredReason = columns[6]
                            .takeIf(String::isNotEmpty)
                            ?.let(PaymentIgnoredReason::valueOf),
                        sourceAppId = sourceAppId,
                    )
                }
                .toList()
        }
    }

    private fun input(
        sourceAppId: String = BundledPaymentRuleCatalog.SYNTHETIC_SOURCE_APP_ID,
        title: String?,
        text: String?,
    ) = PaymentDetectionInput(
        sourceAppId = sourceAppId,
        title = title,
        text = text,
        bigText = null,
        postedAtEpochMillis = POSTED_AT,
    )

    private data class Fixture(
        val id: String,
        val tier: PaymentMatchTier,
        val title: String?,
        val text: String?,
        val minorUnits: Long?,
        val merchant: String?,
        val ignoredReason: PaymentIgnoredReason?,
        val sourceAppId: String,
    ) {
        fun input() = PaymentDetectionInput(
            sourceAppId = sourceAppId,
            title = title,
            text = text,
            bigText = null,
            postedAtEpochMillis = POSTED_AT,
        )
    }

    companion object {
        private const val POSTED_AT = 1_754_000_000_000L
    }
}
