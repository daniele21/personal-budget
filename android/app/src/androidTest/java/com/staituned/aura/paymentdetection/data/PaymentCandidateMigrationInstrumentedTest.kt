package com.staituned.aura.paymentdetection.data

import androidx.room.Room
import androidx.room.testing.MigrationTestHelper
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class PaymentCandidateMigrationInstrumentedTest {
    private val databaseName = "payment_candidate_migration_test"

    @get:Rule
    val helper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        PaymentCandidateDatabase::class.java,
    )

    @Test
    fun exportedVersionOneSchemaOpensWithTheCurrentDatabaseDefinition() {
        helper.createDatabase(
            databaseName,
            PaymentCandidateDatabase.SCHEMA_VERSION,
        ).close()

        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val database = Room.databaseBuilder(
            context,
            PaymentCandidateDatabase::class.java,
            databaseName,
        ).build()
        try {
            database.openHelper.writableDatabase
        } finally {
            database.close()
        }
    }
}
