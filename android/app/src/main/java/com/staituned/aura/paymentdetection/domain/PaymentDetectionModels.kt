package com.staituned.aura.paymentdetection.domain

internal enum class PaymentMatchTier {
    EXACT,
    REVIEW,
    IGNORED,
}

internal enum class PaymentIgnoredReason {
    EMPTY_INPUT,
    NEGATIVE_SIGNAL,
    UNSUPPORTED_SOURCE,
    UNSUPPORTED_CURRENCY,
    MISSING_AMOUNT,
    NO_APPROVED_PATTERN,
    INVALID_RULE_SET,
}

internal data class PaymentDetectionInput(
    val sourceAppId: String,
    val title: String?,
    val text: String?,
    val bigText: String?,
    val postedAtEpochMillis: Long,
)

internal sealed interface PaymentDetectionResult {
    val tier: PaymentMatchTier

    data class Candidate(
        override val tier: PaymentMatchTier,
        val sourceAppId: String,
        val operationType: String,
        val amountMinorUnits: Long,
        val currency: String,
        val merchant: String?,
        val occurredAtEpochMillis: Long,
        val matchedRuleId: String?,
        val ruleVersion: String,
    ) : PaymentDetectionResult {
        init {
            require(tier == PaymentMatchTier.EXACT || tier == PaymentMatchTier.REVIEW)
            require(amountMinorUnits > 0)
            require(currency == "EUR")
        }
    }

    data class Ignored(
        val reason: PaymentIgnoredReason,
    ) : PaymentDetectionResult {
        override val tier = PaymentMatchTier.IGNORED
    }
}
