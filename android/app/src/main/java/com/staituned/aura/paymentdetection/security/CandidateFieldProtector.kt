package com.staituned.aura.paymentdetection.security

import java.nio.charset.StandardCharsets
import java.security.GeneralSecurityException
import javax.crypto.AEADBadTagException
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec

internal data class ProtectedCandidateField(
    val ciphertext: ByteArray,
    val nonce: ByteArray,
)

internal class CandidateKeyUnavailableException : GeneralSecurityException()
internal class CandidateAuthenticationException : GeneralSecurityException()

internal class CandidateFieldProtector(
    private val keyManager: AndroidKeyStoreKeyManager =
        AndroidKeyStoreKeyManager(),
) {
    fun protect(
        plaintext: ByteArray,
        candidateId: String,
        ownerKeyHash: String,
        schemaVersion: Int,
    ): ProtectedCandidateField =
        try {
            val cipher = Cipher.getInstance(AES_GCM)
            cipher.init(
                Cipher.ENCRYPT_MODE,
                keyManager.getOrCreateCandidateEncryptionKey(),
            )
            cipher.updateAAD(associatedData(candidateId, ownerKeyHash, schemaVersion))
            ProtectedCandidateField(
                ciphertext = cipher.doFinal(plaintext),
                nonce = cipher.iv,
            )
        } catch (_: GeneralSecurityException) {
            throw CandidateKeyUnavailableException()
        }

    fun unprotect(
        protectedField: ProtectedCandidateField,
        candidateId: String,
        ownerKeyHash: String,
        schemaVersion: Int,
    ): ByteArray =
        try {
            val cipher = Cipher.getInstance(AES_GCM)
            cipher.init(
                Cipher.DECRYPT_MODE,
                keyManager.getOrCreateCandidateEncryptionKey(),
                GCMParameterSpec(GCM_TAG_BITS, protectedField.nonce),
            )
            cipher.updateAAD(associatedData(candidateId, ownerKeyHash, schemaVersion))
            cipher.doFinal(protectedField.ciphertext)
        } catch (_: AEADBadTagException) {
            throw CandidateAuthenticationException()
        } catch (_: GeneralSecurityException) {
            throw CandidateKeyUnavailableException()
        }

    fun deleteKey() {
        keyManager.deleteCandidateEncryptionKey()
    }

    private fun associatedData(
        candidateId: String,
        ownerKeyHash: String,
        schemaVersion: Int,
    ): ByteArray =
        "$schemaVersion\u0000$candidateId\u0000$ownerKeyHash"
            .toByteArray(StandardCharsets.UTF_8)

    companion object {
        private const val AES_GCM = "AES/GCM/NoPadding"
        private const val GCM_TAG_BITS = 128
    }
}
