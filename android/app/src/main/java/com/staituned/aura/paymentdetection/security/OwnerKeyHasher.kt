package com.staituned.aura.paymentdetection.security

import android.util.Base64
import java.nio.charset.StandardCharsets
import javax.crypto.Mac

internal class OwnerKeyHasher(
    private val keyManager: AndroidKeyStoreKeyManager =
        AndroidKeyStoreKeyManager(),
) {
    fun hashFirebaseUid(firebaseUid: String): String {
        require(firebaseUid.isNotBlank() && firebaseUid.length <= MAX_UID_LENGTH) {
            "Invalid owner identifier."
        }

        val mac = Mac.getInstance(HMAC_SHA256)
        mac.init(keyManager.getOrCreateOwnerHashKey())
        val digest = mac.doFinal(firebaseUid.toByteArray(StandardCharsets.UTF_8))
        return Base64.encodeToString(
            digest,
            Base64.NO_WRAP or Base64.NO_PADDING or Base64.URL_SAFE,
        )
    }

    fun deleteKey() {
        keyManager.deleteOwnerHashKey()
    }

    companion object {
        private const val HMAC_SHA256 = "HmacSHA256"
        private const val MAX_UID_LENGTH = 256
    }
}
