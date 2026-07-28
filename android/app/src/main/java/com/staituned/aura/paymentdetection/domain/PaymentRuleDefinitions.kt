package com.staituned.aura.paymentdetection.domain

internal data class NegativePaymentRuleDefinition(
    val id: String,
    val pattern: String,
)

internal data class ExactPaymentRuleDefinition(
    val id: String,
    val titlePattern: String,
    val bodyPattern: String,
)

internal data class PaymentRuleSetDefinition(
    val schemaVersion: Int,
    val ruleVersion: String,
    val sourceAppId: String,
    val negativeRules: List<NegativePaymentRuleDefinition>,
    val exactRules: List<ExactPaymentRuleDefinition>,
    val reviewContextPattern: String,
)

internal object BundledPaymentRuleCatalog {
    const val CURRENT_SCHEMA_VERSION = 1
    const val SYNTHETIC_SOURCE_APP_ID = "aura-synthetic-source"

    private const val AMOUNT =
        """\d{1,3}(?:[.,\s]\d{3})*[,.]\d{2}|\d+[,.]\d{2}"""
    private const val TOKEN_START = """(?:^|[^\p{L}\p{N}])"""
    private const val TOKEN_END = """(?:$|[^\p{L}\p{N}])"""

    private val negativeRules = listOf(
        negative("negative-otp", """otp|codice di verifica|codice sicurezza|one time password"""),
        negative("negative-login", """accesso|login|nuovo dispositivo|password"""),
        negative("negative-balance", """saldo|disponibilità|disponibile"""),
        negative("negative-promotion", """promozione|offerta|sconto|cashback disponibile"""),
        negative("negative-declined", """rifiutat[oa]|negat[oa]|non autorizzat[oa]"""),
        negative("negative-cancelled", """annullat[oa]|stornat[oa]|revocat[oa]"""),
        negative(
            "negative-unsupported-operation",
            """bonifico|trasferimento|accredito|entrata|pagamento p2p""",
        ),
    )

    private val syntheticRuleSet = PaymentRuleSetDefinition(
        schemaVersion = CURRENT_SCHEMA_VERSION,
        ruleVersion = "synthetic-wallet-v1",
        sourceAppId = SYNTHETIC_SOURCE_APP_ID,
        negativeRules = negativeRules,
        exactRules = listOf(
            ExactPaymentRuleDefinition(
                id = "synthetic-wallet-card-payment-v1",
                titlePattern = """^pagamento effettuato$""",
                bodyPattern =
                    """^(?<amount>$AMOUNT)\s*€""" +
                        """(?:\s+presso\s+(?<merchant>[\p{L}\p{N}][\p{L}\p{N} .&'’\-]{0,119}))?""" +
                        """\s*·\s*wallet simulato$""",
            ),
        ),
        reviewContextPattern =
            """$TOKEN_START(?:pagamento|acquisto|spesa|carta)$TOKEN_END""",
    )

    private val definitions = listOf(syntheticRuleSet)

    fun findBySourceAppId(sourceAppId: String): PaymentRuleSetDefinition? =
        definitions.firstOrNull { it.sourceAppId == sourceAppId }

    fun all(): List<PaymentRuleSetDefinition> = definitions

    private fun negative(id: String, terms: String) =
        NegativePaymentRuleDefinition(
            id = id,
            pattern = """$TOKEN_START(?:$terms)$TOKEN_END""",
        )
}

internal object PaymentRegexSafety {
    private const val MAX_PATTERN_CHARACTERS = 512
    private val backReference = Regex("""\\[1-9]""")
    private val nestedUnboundedQuantifier =
        Regex("""\((?:\?:)?[^)]*(?:\.\*|\.\+|\\[wWdDsS][*+])[^)]*\)[*+]""")

    fun isAllowed(pattern: String): Boolean =
        pattern.length <= MAX_PATTERN_CHARACTERS &&
            "(?<=" !in pattern &&
            "(?<!" !in pattern &&
            !backReference.containsMatchIn(pattern) &&
            !nestedUnboundedQuantifier.containsMatchIn(pattern)
}
