package com.staituned.aura.paymentdetection.data

import android.content.Context
import com.staituned.aura.paymentdetection.security.AcceptanceTokenFactory
import com.staituned.aura.paymentdetection.security.CandidateFieldProtector
import com.staituned.aura.paymentdetection.security.CandidateFingerprintHasher
import com.staituned.aura.paymentdetection.security.OwnerKeyHasher

internal enum class NativePurgeReason(val bridgeValue: String) {
    LOGOUT("logout"),
    ACCOUNT_CHANGE("account_change"),
    LOCAL_RESET("local_reset"),
    TOTAL_DELETION("total_deletion");

    companion object {
        fun fromBridgeValue(value: String?): NativePurgeReason? =
            entries.firstOrNull { it.bridgeValue == value }
    }
}

internal class PaymentDetectionPrivacyStore(
    private val context: Context,
    private val ownerKeyHasher: OwnerKeyHasher = OwnerKeyHasher(),
    private val candidateFieldProtector: CandidateFieldProtector =
        CandidateFieldProtector(),
    private val candidateFingerprintHasher: CandidateFingerprintHasher =
        CandidateFingerprintHasher(),
    private val acceptanceTokenFactory: AcceptanceTokenFactory =
        AcceptanceTokenFactory(),
    private val namespace: String = DEFAULT_NAMESPACE,
) {
    private val preferencesName = "aura_${namespace}_private"
    internal val candidateDatabaseName = "aura_${namespace}_candidates.db"
    private val preferences
        get() = context.getSharedPreferences(preferencesName, Context.MODE_PRIVATE)

    @Synchronized
    fun recoverInterruptedPurge() {
        val reason = NativePurgeReason.fromBridgeValue(
            preferences.getString(PURGE_JOURNAL_KEY, null),
        ) ?: return
        completePurge(reason)
    }

    @Synchronized
    fun registerOwner(firebaseUid: String) {
        recoverInterruptedPurge()
        val ownerKeyHash = ownerKeyHasher.hashFirebaseUid(firebaseUid)
        val previousOwner = preferences.getString(ACTIVE_OWNER_KEY, null)
        if (previousOwner != null && previousOwner != ownerKeyHash) {
            purge(NativePurgeReason.ACCOUNT_CHANGE)
        }
        check(
            preferences.edit()
                .putString(ACTIVE_OWNER_KEY, ownerKeyHash)
                .commit(),
        ) {
            "Unable to persist the native owner boundary."
        }
    }

    @Synchronized
    fun purge(reason: NativePurgeReason) {
        check(
            preferences.edit()
                .putString(PURGE_JOURNAL_KEY, reason.bridgeValue)
                .commit(),
        ) {
            "Unable to start the native purge journal."
        }
        completePurge(reason)
    }

    internal fun hasActiveOwner(): Boolean =
        preferences.contains(ACTIVE_OWNER_KEY)

    internal fun requireActiveOwnerHash(): String =
        checkNotNull(preferences.getString(ACTIVE_OWNER_KEY, null)) {
            "No active native owner."
        }

    private fun completePurge(reason: NativePurgeReason) {
        PaymentCandidateDatabaseProvider.closeAndDelete(
            context,
            candidateDatabaseName,
        )
        context.deleteSharedPreferences("aura_${namespace}_settings")
        if (reason == NativePurgeReason.TOTAL_DELETION) {
            ownerKeyHasher.deleteKey()
            candidateFieldProtector.deleteKey()
            candidateFingerprintHasher.deleteKey()
            acceptanceTokenFactory.deleteKey()
        }
        check(context.deleteSharedPreferences(preferencesName)) {
            "Unable to clear native private preferences."
        }
    }

    companion object {
        private const val DEFAULT_NAMESPACE = "payment_detection"
        private const val ACTIVE_OWNER_KEY = "active_owner_key_hash"
        private const val PURGE_JOURNAL_KEY = "purge_in_progress"
    }
}
