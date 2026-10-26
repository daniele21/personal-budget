package com.staituned.aura.paymentdetection.domain

internal data class NegativePaymentRuleDefinition(
    val id: String,
    val pattern: String,
)

internal data class ExactPaymentRuleDefinition(
    val id: String,
    val titlePattern: String?,
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
    const val INTESA_SANPAOLO_SOURCE_APP_ID = "intesa-sanpaolo-mobile"
    const val GOOGLE_WALLET_SOURCE_APP_ID = "google-wallet"
    const val PAYPAL_SOURCE_APP_ID = "paypal"

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

    private val intesaSanpaoloRuleSet = PaymentRuleSetDefinition(
        schemaVersion = CURRENT_SCHEMA_VERSION,
        ruleVersion = "intesa-sanpaolo-card-v4",
        sourceAppId = INTESA_SANPAOLO_SOURCE_APP_ID,
        negativeRules = negativeRules + listOf(
            negative(
                "intesa-negative-income",
                """accreditat[oa]|stipendio|pensione|emolumento""",
            ),
            negative("intesa-negative-not-paid", """non\s+hai\s+pagato"""),
        ),
        exactRules = listOf(
            ExactPaymentRuleDefinition(
                id = "intesa-card-payment-v4",
                titlePattern = null,
                bodyPattern =
                    """^(?:💸\s*)?hai\s+pagato\s+(?<amount>$AMOUNT)\s*(?:€|EUR)""" +
                        // Bank-specific payment, amount and merchant are the
                        // necessary exact evidence. Card/date/time details vary
                        // by device and notification layout, so never require them.
                        // Keep the intervening text bounded and do not capture it.
                        """(?:\s+\S{1,48}){0,24}?\s+(?:da|presso)\s+""" +
                        """(?<merchant>[\p{L}\p{N}][\p{L}\p{N} .,&*'’\-]{0,119}?)""" +
                        // Intesa can append a non-merchant routing reference.
                        // Do not persist it with the merchant.
                        """(?:,\s*[\p{L}\p{N}]{2,12}_[\p{L}\p{N}]{2,24},\s*[\p{L}\p{N}]{1,24})?""" +
                        // An optional balance footer is not part of the payment
                        // and must not become a merchant or an extra amount.
                        """[.]?(?:\s+hai\s+ancora\s+a\s+disposizione\s+(?:$AMOUNT)\s*(?:€|EUR)[.]?)?$""",
            ),
        ),
        reviewContextPattern =
            """${TOKEN_START}hai\s+pagato$TOKEN_END""",
    )

    private val googleWalletRuleSet = PaymentRuleSetDefinition(
        schemaVersion = CURRENT_SCHEMA_VERSION,
        ruleVersion = "google-wallet-card-v1",
        sourceAppId = GOOGLE_WALLET_SOURCE_APP_ID,
        negativeRules = negativeRules,
        exactRules = listOf(
            ExactPaymentRuleDefinition(
                id = "google-wallet-card-payment-v1",
                titlePattern =
                    """^(?<merchant>[\p{L}\p{N}][\p{L}\p{N} .,&*'’\-]{0,119})$""",
                bodyPattern =
                    """^€\s*(?<amount>$AMOUNT)\s+with\s+""" +
                        """[\p{L}\p{N}][\p{L}\p{N} .&'’\-]{0,79}\s+""" +
                        """(?:[•·]{2}|[*]{2})\d{4}$""",
            ),
        ),
        reviewContextPattern =
            """€\s*(?:$AMOUNT)\s+with$TOKEN_END""",
    )

    private val paypalRuleSet = PaymentRuleSetDefinition(
        schemaVersion = CURRENT_SCHEMA_VERSION,
        ruleVersion = "paypal-purchase-v1",
        sourceAppId = PAYPAL_SOURCE_APP_ID,
        negativeRules = negativeRules,
        exactRules = listOf(
            ExactPaymentRuleDefinition(
                id = "paypal-completed-purchase-v1",
                titlePattern =
                    """^il tuo acquisto presso\s+(?<merchant>[\p{L}\p{N}][\p{L}\p{N} .,&*'’\-]{0,119})$""",
                bodyPattern =
                    """^il tuo pagamento di\s+€\s*(?<amount>$AMOUNT)\s+EUR\s+""" +
                        """è stato completato[.](?:\s+tocca per\s+""" +
                        """[\p{L}\p{N} .,'’\-]{1,120})?[.]?$""",
            ),
        ),
        reviewContextPattern =
            """$TOKEN_START(?:il tuo acquisto|il tuo pagamento)$TOKEN_END""",
    )

    private val definitions = listOf(
        syntheticRuleSet,
        intesaSanpaoloRuleSet,
        googleWalletRuleSet,
        paypalRuleSet,
    )

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
