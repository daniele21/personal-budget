package com.staituned.aura.paymentdetection.security

import android.util.Base64
import java.nio.charset.StandardCharsets
import java.text.Normalizer
import java.util.Locale
import javax.crypto.Mac

internal class CandidateFingerprintHasher(
    private val keyManager: AndroidKeyStoreKeyManager =
        AndroidKeyStoreKeyManager(),
) {
    fun hashTechnical(
        ownerKeyHash: String,
        sourceAppId: String,
        notificationKey: String,
    ): String = hmac(
        listOf(TECHNICAL_VERSION, ownerKeyHash, sourceAppId, notificationKey),
    )

    fun hashSemantic(
        ownerKeyHash: String,
        operationType: String,
        amountMinorUnits: Long,
        currency: String,
        merchant: String,
    ): String = hmac(
        listOf(
            SEMANTIC_VERSION,
            ownerKeyHash,
            operationType,
            amountMinorUnits.toString(),
            currency,
            normalizeMerchant(merchant),
        ),
    )

    private fun normalizeMerchant(merchant: String): String =
        Normalizer.normalize(merchant, Normalizer.Form.NFKD)
            .replace(COMBINING_MARKS, "")
            .lowercase(Locale.ROOT)
            .replace(NON_ALPHANUMERIC, " ")
            .replace(WHITESPACE, " ")
            .trim()

    fun deleteKey() {
        keyManager.deleteCandidateFingerprintKey()
    }

    private fun hmac(parts: List<String>): String {
        val mac = Mac.getInstance(HMAC_SHA256)
        mac.init(keyManager.getOrCreateCandidateFingerprintKey())
        val digest = mac.doFinal(
            parts.joinToString("\u0000").toByteArray(StandardCharsets.UTF_8),
        )
        return Base64.encodeToString(
            digest,
            Base64.NO_WRAP or Base64.NO_PADDING or Base64.URL_SAFE,
        )
    }

    companion object {
        private const val HMAC_SHA256 = "HmacSHA256"
        private const val TECHNICAL_VERSION = "technical-v1"
        private const val SEMANTIC_VERSION = "semantic-v2"
        private val COMBINING_MARKS = Regex("""\p{M}+""")
        private val NON_ALPHANUMERIC = Regex("""[^\p{L}\p{N}]+""")
        private val WHITESPACE = Regex("""\s+""")
    }
}
