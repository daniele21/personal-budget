package com.staituned.aura.paymentdetection.security

import java.security.SecureRandom
import java.util.Base64

internal object SecureOpaqueId {
    private val random = SecureRandom()

    fun create(): String {
        val bytes = ByteArray(18)
        random.nextBytes(bytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }
}
