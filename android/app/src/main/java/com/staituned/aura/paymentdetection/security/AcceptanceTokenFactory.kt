package com.staituned.aura.paymentdetection.security

import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import javax.crypto.Mac

internal class AcceptanceTokenFactory(
    private val keyManager: AndroidKeyStoreKeyManager =
        AndroidKeyStoreKeyManager(),
) {
    fun create(
        ownerKeyHash: String,
        candidateId: String,
        reservedTransactionId: String,
    ): String {
        val mac = Mac.getInstance(HMAC_SHA256)
        mac.init(keyManager.getOrCreateAcceptanceTokenKey())
        val digest = mac.doFinal(
            listOf(
                TOKEN_VERSION,
                ownerKeyHash,
                candidateId,
                reservedTransactionId,
            ).joinToString("\u0000").toByteArray(StandardCharsets.UTF_8),
        )
        return Base64.encodeToString(
            digest,
            Base64.NO_WRAP or Base64.NO_PADDING or Base64.URL_SAFE,
        )
    }

    fun hash(token: String): String {
        val digest = MessageDigest.getInstance(SHA_256)
            .digest(token.toByteArray(StandardCharsets.UTF_8))
        return Base64.encodeToString(
            digest,
            Base64.NO_WRAP or Base64.NO_PADDING or Base64.URL_SAFE,
        )
    }

    fun matches(token: String, expectedHash: String): Boolean =
        MessageDigest.isEqual(
            hash(token).toByteArray(StandardCharsets.US_ASCII),
            expectedHash.toByteArray(StandardCharsets.US_ASCII),
        )

    fun deleteKey() {
        keyManager.deleteAcceptanceTokenKey()
    }

    companion object {
        private const val HMAC_SHA256 = "HmacSHA256"
        private const val SHA_256 = "SHA-256"
        private const val TOKEN_VERSION = "acceptance-v1"
    }
}
