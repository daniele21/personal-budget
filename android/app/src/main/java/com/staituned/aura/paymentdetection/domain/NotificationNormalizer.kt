package com.staituned.aura.paymentdetection.domain

import java.text.Normalizer

internal object NotificationNormalizer {
    const val MAX_FIELD_CHARACTERS = 512
    const val MAX_MERCHANT_CHARACTERS = 120

    private val whitespace = Regex("""\s+""")
    private val prohibitedPaymentIdentifier = Regex(
        """(?:carta|card|conto|account|iban)\s*[:#-]?\s*[a-z0-9* x]{3,}""",
        RegexOption.IGNORE_CASE,
    )

    fun normalize(value: String?): String? {
        if (value.isNullOrBlank()) return null
        return Normalizer.normalize(
            value.take(MAX_FIELD_CHARACTERS),
            Normalizer.Form.NFKC,
        )
            .replace(whitespace, " ")
            .trim()
            .take(MAX_FIELD_CHARACTERS)
            .ifEmpty { null }
    }

    fun merchant(value: String?): String? {
        val normalized = normalize(value)
            ?.trim(' ', '.', ',', '·', '-', ':')
            ?.take(MAX_MERCHANT_CHARACTERS)
            ?.ifEmpty { null }
            ?: return null
        return normalized.takeUnless(prohibitedPaymentIdentifier::containsMatchIn)
    }
}
