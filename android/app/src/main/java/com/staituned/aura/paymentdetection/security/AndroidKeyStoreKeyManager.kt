package com.staituned.aura.paymentdetection.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

internal class AndroidKeyStoreKeyManager {
    private val keyStore: KeyStore
        get() = KeyStore.getInstance(ANDROID_KEY_STORE).apply { load(null) }

    fun getOrCreateOwnerHashKey(): SecretKey =
        getSecretKey(OWNER_HASH_ALIAS) ?: createHmacKey()

    fun getOrCreateCandidateEncryptionKey(): SecretKey =
        getSecretKey(CANDIDATE_ENCRYPTION_ALIAS) ?: createAesKey()

    fun deleteOwnerHashKey() {
        deleteKey(OWNER_HASH_ALIAS)
    }

    fun deleteCandidateEncryptionKey() {
        deleteKey(CANDIDATE_ENCRYPTION_ALIAS)
    }

    private fun getSecretKey(alias: String): SecretKey? =
        keyStore.getKey(alias, null) as? SecretKey

    private fun createHmacKey(): SecretKey {
        val generator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_HMAC_SHA256,
            ANDROID_KEY_STORE,
        )
        generator.init(
            KeyGenParameterSpec.Builder(
                OWNER_HASH_ALIAS,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY,
            )
                .setDigests(KeyProperties.DIGEST_SHA256)
                .build(),
        )
        return generator.generateKey()
    }

    private fun createAesKey(): SecretKey {
        val generator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEY_STORE,
        )
        generator.init(
            KeyGenParameterSpec.Builder(
                CANDIDATE_ENCRYPTION_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build(),
        )
        return generator.generateKey()
    }

    private fun deleteKey(alias: String) {
        val store = keyStore
        if (store.containsAlias(alias)) store.deleteEntry(alias)
    }

    companion object {
        private const val ANDROID_KEY_STORE = "AndroidKeyStore"
        private const val OWNER_HASH_ALIAS = "aura.payment.owner-hash.v1"
        private const val CANDIDATE_ENCRYPTION_ALIAS =
            "aura.payment.candidate-encryption.v1"
    }
}
