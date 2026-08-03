package com.staituned.aura.paymentdetection.domain

internal class PaymentRuleEngine(
    definitions: List<PaymentRuleSetDefinition> = BundledPaymentRuleCatalog.all(),
) {
    private val compiledRuleSets = definitions.mapNotNull(::compileRuleSet)

    fun evaluate(input: PaymentDetectionInput): PaymentDetectionResult {
        return try {
            evaluateSafely(input)
        } catch (_: RuntimeException) {
            PaymentDetectionResult.Ignored(PaymentIgnoredReason.INVALID_RULE_SET)
        }
    }

    private fun evaluateSafely(input: PaymentDetectionInput): PaymentDetectionResult {
        val rules = compiledRuleSets.firstOrNull { it.sourceAppId == input.sourceAppId }
            ?: return PaymentDetectionResult.Ignored(
                if (BundledPaymentRuleCatalog.findBySourceAppId(input.sourceAppId) == null) {
                    PaymentIgnoredReason.UNSUPPORTED_SOURCE
                } else {
                    PaymentIgnoredReason.INVALID_RULE_SET
                },
            )
        val normalized = NormalizedNotification(
            title = NotificationNormalizer.normalize(input.title),
            text = NotificationNormalizer.normalize(input.text),
            bigText = NotificationNormalizer.normalize(input.bigText),
        )
        val searchable = normalized.searchableText()
            ?: return PaymentDetectionResult.Ignored(PaymentIgnoredReason.EMPTY_INPUT)

        if (rules.negativeRules.any { it.containsMatchIn(searchable) }) {
            return PaymentDetectionResult.Ignored(PaymentIgnoredReason.NEGATIVE_SIGNAL)
        }

        val exact = exactCandidate(rules, normalized, input)
        if (exact != null) return exact

        if (containsUnsupportedCurrency(searchable)) {
            return PaymentDetectionResult.Ignored(PaymentIgnoredReason.UNSUPPORTED_CURRENCY)
        }
        if (!rules.reviewContext.containsMatchIn(searchable)) {
            return PaymentDetectionResult.Ignored(PaymentIgnoredReason.NO_APPROVED_PATTERN)
        }
        val amount = extractEurAmount(searchable)
            ?: return PaymentDetectionResult.Ignored(PaymentIgnoredReason.MISSING_AMOUNT)

        return PaymentDetectionResult.Candidate(
            tier = PaymentMatchTier.REVIEW,
            sourceAppId = input.sourceAppId,
            operationType = CARD_PAYMENT,
            amountMinorUnits = amount,
            currency = EUR,
            merchant = null,
            occurredAtEpochMillis = input.postedAtEpochMillis,
            matchedRuleId = null,
            ruleVersion = rules.ruleVersion,
        )
    }

    private fun exactCandidate(
        rules: CompiledPaymentRuleSet,
        notification: NormalizedNotification,
        input: PaymentDetectionInput,
    ): PaymentDetectionResult.Candidate? {
        for (rule in rules.exactRules) {
            val titleMatch = if (rule.title != null) {
                val title = notification.title ?: continue
                rule.title.matchEntire(title) ?: continue
            } else null
            for (body in notification.bodyCandidates()) {
                val match = rule.body.matchEntire(body) ?: continue
                val amount = parseMinorUnits(match.groups["amount"]?.value) ?: continue
                val merchant = optionalGroup(titleMatch, "merchant")
                    ?: optionalGroup(match, "merchant")
                return PaymentDetectionResult.Candidate(
                    tier = PaymentMatchTier.EXACT,
                    sourceAppId = input.sourceAppId,
                    operationType = CARD_PAYMENT,
                    amountMinorUnits = amount,
                    currency = EUR,
                    merchant = NotificationNormalizer.merchant(
                        merchant,
                    ),
                    occurredAtEpochMillis = input.postedAtEpochMillis,
                    matchedRuleId = rule.id,
                    ruleVersion = rules.ruleVersion,
                )
            }
        }
        return null
    }

    private fun optionalGroup(match: MatchResult?, name: String): String? =
        match?.let { runCatching { it.groups[name]?.value }.getOrNull() }

    private fun compileRuleSet(
        definition: PaymentRuleSetDefinition,
    ): CompiledPaymentRuleSet? {
        if (definition.schemaVersion != BundledPaymentRuleCatalog.CURRENT_SCHEMA_VERSION) {
            return null
        }
        if (!PaymentRegexSafety.isAllowed(definition.reviewContextPattern)) return null
        val negativeRules = definition.negativeRules.map { rule ->
            if (!PaymentRegexSafety.isAllowed(rule.pattern)) return null
            runCatching { Regex(rule.pattern, REGEX_OPTIONS) }.getOrNull() ?: return null
        }
        val exactRules = definition.exactRules.mapNotNull { rule ->
            if (
                (rule.titlePattern != null &&
                    !PaymentRegexSafety.isAllowed(rule.titlePattern)) ||
                !PaymentRegexSafety.isAllowed(rule.bodyPattern)
            ) {
                return@mapNotNull null
            }
            val title = rule.titlePattern?.let { pattern ->
                runCatching {
                    Regex(pattern, REGEX_OPTIONS)
                }.getOrNull() ?: return@mapNotNull null
            }
            val body = runCatching {
                Regex(rule.bodyPattern, REGEX_OPTIONS)
            }.getOrNull() ?: return@mapNotNull null
            CompiledExactPaymentRule(rule.id, title, body)
        }
        val reviewContext = runCatching {
            Regex(definition.reviewContextPattern, REGEX_OPTIONS)
        }.getOrNull() ?: return null
        return CompiledPaymentRuleSet(
            sourceAppId = definition.sourceAppId,
            ruleVersion = definition.ruleVersion,
            negativeRules = negativeRules,
            exactRules = exactRules,
            reviewContext = reviewContext,
        )
    }

    private fun extractEurAmount(value: String): Long? {
        val suffix = EUR_SUFFIX.find(value)?.groups?.get("amount")?.value
        if (suffix != null) return parseMinorUnits(suffix)
        val prefix = EUR_PREFIX.find(value)?.groups?.get("amount")?.value
        return parseMinorUnits(prefix)
    }

    private fun parseMinorUnits(value: String?): Long? {
        if (value == null) return null
        val compact = value.replace(" ", "")
        val separatorIndex = maxOf(compact.lastIndexOf(','), compact.lastIndexOf('.'))
        if (separatorIndex <= 0 || compact.length - separatorIndex - 1 != 2) return null
        val fraction = compact.substring(separatorIndex + 1)
        val major = compact.substring(0, separatorIndex)
            .replace(".", "")
            .replace(",", "")
        if (major.isEmpty() || !major.all(Char::isDigit) || !fraction.all(Char::isDigit)) {
            return null
        }
        val majorUnits = major.toLongOrNull() ?: return null
        return try {
            Math.addExact(Math.multiplyExact(majorUnits, 100), fraction.toLong())
        } catch (_: ArithmeticException) {
            null
        }
    }

    private fun containsUnsupportedCurrency(value: String): Boolean =
        UNSUPPORTED_CURRENCY.containsMatchIn(value)

    private data class NormalizedNotification(
        val title: String?,
        val text: String?,
        val bigText: String?,
    ) {
        fun searchableText(): String? =
            listOfNotNull(title, text, bigText)
                .distinct()
                .joinToString(" ")
                .ifEmpty { null }

        fun bodyCandidates(): List<String> = listOfNotNull(bigText, text).distinct()
    }

    private data class CompiledExactPaymentRule(
        val id: String,
        val title: Regex?,
        val body: Regex,
    )

    private data class CompiledPaymentRuleSet(
        val sourceAppId: String,
        val ruleVersion: String,
        val negativeRules: List<Regex>,
        val exactRules: List<CompiledExactPaymentRule>,
        val reviewContext: Regex,
    )

    companion object {
        private const val CARD_PAYMENT = "card_payment"
        private const val EUR = "EUR"
        private val REGEX_OPTIONS = setOf(RegexOption.IGNORE_CASE)
        private val EUR_SUFFIX = Regex(
            """(?:^|[^\p{L}\p{N}])(?<amount>\d{1,3}(?:[.,\s]\d{3})*[,.]\d{2}|\d+[,.]\d{2})\s*(?:€|EUR)(?:$|[^\p{L}\p{N}])""",
            REGEX_OPTIONS,
        )
        private val EUR_PREFIX = Regex(
            """(?:^|[^\p{L}\p{N}])(?:€|EUR)\s*(?<amount>\d{1,3}(?:[.,\s]\d{3})*[,.]\d{2}|\d+[,.]\d{2})(?:$|[^\p{L}\p{N}])""",
            REGEX_OPTIONS,
        )
        private val UNSUPPORTED_CURRENCY = Regex(
            """(?:[$£¥]|(?:^|[^\p{L}])(?:USD|GBP|CHF|JPY)(?:$|[^\p{L}]))""",
            setOf(RegexOption.IGNORE_CASE),
        )
    }
}
