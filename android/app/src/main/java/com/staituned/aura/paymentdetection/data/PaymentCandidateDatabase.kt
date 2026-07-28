package com.staituned.aura.paymentdetection.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [PaymentCandidateEntity::class],
    version = PaymentCandidateDatabase.SCHEMA_VERSION,
    exportSchema = true,
)
internal abstract class PaymentCandidateDatabase : RoomDatabase() {
    abstract fun candidateDao(): PaymentCandidateDao

    companion object {
        const val SCHEMA_VERSION = 1
        const val DEFAULT_DATABASE_NAME = "aura_payment_detection_candidates.db"
    }
}

internal object PaymentCandidateDatabaseProvider {
    private val databases = mutableMapOf<String, PaymentCandidateDatabase>()

    @Synchronized
    fun get(
        context: Context,
        databaseName: String = PaymentCandidateDatabase.DEFAULT_DATABASE_NAME,
    ): PaymentCandidateDatabase =
        databases.getOrPut(databaseName) {
            Room.databaseBuilder(
                context.applicationContext,
                PaymentCandidateDatabase::class.java,
                databaseName,
            )
                // A missing migration fails closed. Candidate data is never
                // destroyed silently to recover from a schema mismatch.
                .build()
        }

    @Synchronized
    fun close(databaseName: String) {
        databases.remove(databaseName)?.close()
    }

    @Synchronized
    fun closeAndDelete(context: Context, databaseName: String): Boolean {
        close(databaseName)
        return context.deleteDatabase(databaseName)
    }
}
