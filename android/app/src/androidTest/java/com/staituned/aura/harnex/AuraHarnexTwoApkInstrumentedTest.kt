package com.staituned.aura.harnex

import android.content.pm.PackageManager
import android.os.ParcelFileDescriptor
import android.os.SystemClock
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.staituned.aura.BuildConfig
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeFalse
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class AuraHarnexTwoApkInstrumentedTest {
    @Test
    fun hostAbsentFailsClosed() {
        assumeFalse("Harnex fixture must be absent for this scenario", hostInstalled())

        newRunner().use { runner ->
            val connection = runner.connect()
            assertUnavailable(connection, AuraHarnexFailureCode.HOST_NOT_INSTALLED)
        }
    }

    @Test
    fun packagedAuraExercisesAuthorizedHarnexLifecycle() {
        assumeTrue("Harnex emulatorE2e fixture is required for this scenario", hostInstalled())

        resetHostFaults()
        assertHostStatus("application=PENDING")
        assertPendingConsumerFailsClosed()

        assertShellSuccess(AUTHORIZE_AURA)
        assertHostStatus("application=AUTHORIZED")
        assertCapabilitiesAvailable()

        assertShellSuccess(DISABLE_AURA_SCHEMA)
        assertProbeFailure(AuraHarnexUseCase.SCHEMA_INFERENCE, AuraHarnexFailureCode.USE_CASE_NOT_ASSIGNED)
        assertShellSuccess(ENABLE_AURA_SCHEMA)

        assertShellSuccess(MODEL_UNAVAILABLE)
        assertProbeFailure(AuraHarnexUseCase.SCHEMA_INFERENCE, AuraHarnexFailureCode.MODEL_UNAVAILABLE)
        assertShellSuccess(MODEL_AVAILABLE)

        assertSchemaGeneration()
        assertCategoryGeneration()
        assertCancellationCleansUp()
        assertDisconnectReconnect()
        assertHostRestartPreservesAuthorization()
    }

    private fun assertPendingConsumerFailsClosed() {
        newRunner().use { runner ->
            assertUnavailable(runner.connect(), AuraHarnexFailureCode.UNAUTHORIZED)
        }
    }

    private fun assertCapabilitiesAvailable() {
        newRunner().use { runner ->
            assertTrue(runner.connect() is AuraHarnexConnectionOutcome.Connected)
            assertTrue(runner.probe(AuraHarnexUseCase.SCHEMA_INFERENCE) is AuraHarnexCapabilityOutcome.Available)
            assertTrue(runner.probe(AuraHarnexUseCase.CATEGORY_CLASSIFICATION) is AuraHarnexCapabilityOutcome.Available)
            assertTrue(runner.disconnect() is AuraHarnexDisconnectOutcome.Disconnected)
        }
    }

    private fun assertProbeFailure(useCase: AuraHarnexUseCase, expected: AuraHarnexFailureCode) {
        newRunner().use { runner ->
            assertTrue(runner.connect() is AuraHarnexConnectionOutcome.Connected)
            val outcome = runner.probe(useCase)
            assertTrue("Expected unavailable capability but got $outcome", outcome is AuraHarnexCapabilityOutcome.Unavailable)
            assertEquals(expected, (outcome as AuraHarnexCapabilityOutcome.Unavailable).failure.code)
            assertTrue(runner.disconnect() is AuraHarnexDisconnectOutcome.Disconnected)
        }
    }

    private fun assertSchemaGeneration() {
        newRunner().use { runner ->
            assertTrue(runner.connect() is AuraHarnexConnectionOutcome.Connected)
            val outcome = runner.generate(
                AuraHarnexUseCase.SCHEMA_INFERENCE,
                SCHEMA_INPUT,
                SCHEMA_JSON_SCHEMA,
            )
            assertTrue("Schema generation did not complete: $outcome", outcome is AuraHarnexGenerationOutcome.Completed)
            val answer = (outcome as AuraHarnexGenerationOutcome.Completed).answer
            assertTrue(answer.contains("\"status\":\"resolved\""))
            assertTrue(answer.contains("\"sheetId\":\"sheet-1\""))
            assertTrue(answer.contains("\"headerCandidateId\":\"header-1\""))
            assertTrue(answer.contains("\"dateCandidateId\":\"date-1\""))
            assertTrue(answer.contains("\"amountCandidateId\":\"amount-1\""))
            assertTrue(answer.contains("\"column-description\""))
            assertTrue(runner.disconnect() is AuraHarnexDisconnectOutcome.Disconnected)
        }
    }

    private fun assertCategoryGeneration() {
        newRunner().use { runner ->
            assertTrue(runner.connect() is AuraHarnexConnectionOutcome.Connected)
            val outcome = runner.generate(
                AuraHarnexUseCase.CATEGORY_CLASSIFICATION,
                CATEGORY_INPUT,
                CATEGORY_JSON_SCHEMA,
            )
            assertTrue("Category generation did not complete: $outcome", outcome is AuraHarnexGenerationOutcome.Completed)
            val answer = (outcome as AuraHarnexGenerationOutcome.Completed).answer
            assertTrue(answer.contains("\"id\":\"group-1\""))
            assertTrue(answer.contains("\"categoryId\":\"category-groceries\""))
            assertTrue(runner.disconnect() is AuraHarnexDisconnectOutcome.Disconnected)
        }
    }

    private fun assertCancellationCleansUp() {
        assertShellSuccess(PAUSE_GENERATION)
        val executor = Executors.newSingleThreadExecutor()
        try {
            newRunner().use { runner ->
                assertTrue(runner.connect() is AuraHarnexConnectionOutcome.Connected)
                val future = executor.submit<AuraHarnexGenerationOutcome> {
                    runner.generate(
                        AuraHarnexUseCase.SCHEMA_INFERENCE,
                        SCHEMA_INPUT,
                        SCHEMA_JSON_SCHEMA,
                    )
                }
                awaitHostGenerationWaiting()
                assertTrue("Aura runner rejected cancellation while generation was active", runner.cancel())
                val outcome = future.get(GENERATION_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                assertTrue("Expected cancelled generation but got $outcome", outcome is AuraHarnexGenerationOutcome.Failed)
                assertEquals(
                    AuraHarnexFailureCode.CANCELLED,
                    (outcome as AuraHarnexGenerationOutcome.Failed).failure.code,
                )
                assertTrue(runner.disconnect() is AuraHarnexDisconnectOutcome.Disconnected)
            }
        } finally {
            executor.shutdownNow()
            assertShellSuccess(RELEASE_GENERATION)
            resetHostFaults()
        }

        // A fresh request after cancellation proves session/activation cleanup did not orphan ownership.
        assertSchemaGeneration()
    }

    private fun assertDisconnectReconnect() {
        newRunner().use { runner ->
            assertTrue(runner.connect() is AuraHarnexConnectionOutcome.Connected)
            assertTrue(runner.disconnect() is AuraHarnexDisconnectOutcome.Disconnected)
            assertTrue(runner.connect() is AuraHarnexConnectionOutcome.Connected)
            assertTrue(runner.probe(AuraHarnexUseCase.CATEGORY_CLASSIFICATION) is AuraHarnexCapabilityOutcome.Available)
            assertTrue(runner.disconnect() is AuraHarnexDisconnectOutcome.Disconnected)
        }
    }

    private fun assertHostRestartPreservesAuthorization() {
        runShell("am force-stop ${BuildConfig.HARNEX_HOST_PACKAGE}")
        runShell(
            "am start -W -n ${BuildConfig.HARNEX_HOST_PACKAGE}/" +
                "io.github.daniele21.localllm.phonetest.MainActivity",
        )
        awaitHostStatus("application=AUTHORIZED")

        newRunner().use { runner ->
            assertTrue(runner.connect() is AuraHarnexConnectionOutcome.Connected)
            assertTrue(runner.probe(AuraHarnexUseCase.SCHEMA_INFERENCE) is AuraHarnexCapabilityOutcome.Available)
            assertTrue(runner.disconnect() is AuraHarnexDisconnectOutcome.Disconnected)
        }
    }

    private fun awaitHostGenerationWaiting() {
        val deadline = SystemClock.elapsedRealtime() + HOST_STATE_TIMEOUT_MS
        var last = ""
        while (SystemClock.elapsedRealtime() < deadline) {
            last = hostCommand(QUERY_GATE)
            if ("waiting=1" in last) return
            SystemClock.sleep(HOST_STATE_POLL_MS)
        }
        throw AssertionError("Harnex generation never reached the paused backend. Last shell result: $last")
    }

    private fun assertHostStatus(expected: String) {
        val result = hostCommand(QUERY_AURA)
        assertTrue("Expected '$expected' in Harnex status: $result", expected in result)
    }

    private fun awaitHostStatus(expected: String) {
        val deadline = SystemClock.elapsedRealtime() + HOST_STATE_TIMEOUT_MS
        var last = ""
        while (SystemClock.elapsedRealtime() < deadline) {
            last = hostCommand(QUERY_AURA)
            if (expected in last) return
            SystemClock.sleep(HOST_STATE_POLL_MS)
        }
        throw AssertionError("Expected '$expected' in Harnex status after restart. Last shell result: $last")
    }

    private fun resetHostFaults() {
        assertShellSuccess(RESET)
        assertShellSuccess(MODEL_AVAILABLE)
        assertShellSuccess(ENABLE_AURA_SCHEMA)
        assertShellSuccess(ENABLE_AURA_CATEGORY)
    }

    private fun assertShellSuccess(action: String) {
        val output = hostCommand(action)
        assertTrue("Harnex emulator control failed for $action: $output", "result=-1" in output)
    }

    private fun hostCommand(action: String): String = runShell(
        "am broadcast -a $action -n ${BuildConfig.HARNEX_HOST_PACKAGE}/" +
            "io.github.daniele21.localllm.phonetest.HarnessEmulatorE2eShellBridgeReceiver",
    )

    private fun runShell(command: String): String {
        val descriptor = InstrumentationRegistry.getInstrumentation().uiAutomation.executeShellCommand(command)
        return ParcelFileDescriptor.AutoCloseInputStream(descriptor).bufferedReader().use { it.readText() }
    }

    private fun hostInstalled(): Boolean {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        return try {
            context.packageManager.getApplicationInfo(BuildConfig.HARNEX_HOST_PACKAGE, 0)
            true
        } catch (_: PackageManager.NameNotFoundException) {
            false
        }
    }

    private fun newRunner(): AuraHarnexSessionRunner {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        return AuraHarnexSessionRunner(BinderAuraHarnexConsumerClient(context))
    }

    private fun assertUnavailable(outcome: AuraHarnexConnectionOutcome, expected: AuraHarnexFailureCode) {
        assertTrue("Expected unavailable connection but got $outcome", outcome is AuraHarnexConnectionOutcome.Unavailable)
        assertEquals(expected, (outcome as AuraHarnexConnectionOutcome.Unavailable).failure.code)
    }

    private companion object {
        const val HOST_STATE_TIMEOUT_MS = 10_000L
        const val HOST_STATE_POLL_MS = 100L
        const val GENERATION_TIMEOUT_SECONDS = 15L

        const val ACTION_PREFIX = "io.github.daniele21.localllm.phonetest.emulatorE2e."
        const val AUTHORIZE_AURA = "${ACTION_PREFIX}AUTHORIZE_AURA"
        const val ENABLE_AURA_SCHEMA = "${ACTION_PREFIX}ENABLE_AURA_SCHEMA"
        const val DISABLE_AURA_SCHEMA = "${ACTION_PREFIX}DISABLE_AURA_SCHEMA"
        const val ENABLE_AURA_CATEGORY = "${ACTION_PREFIX}ENABLE_AURA_CATEGORY"
        const val MODEL_UNAVAILABLE = "${ACTION_PREFIX}MODEL_UNAVAILABLE"
        const val MODEL_AVAILABLE = "${ACTION_PREFIX}MODEL_AVAILABLE"
        const val PAUSE_GENERATION = "${ACTION_PREFIX}PAUSE_GENERATION"
        const val RELEASE_GENERATION = "${ACTION_PREFIX}RELEASE_GENERATION"
        const val RESET = "${ACTION_PREFIX}RESET"
        const val QUERY_GATE = "${ACTION_PREFIX}QUERY"
        const val QUERY_AURA = "${ACTION_PREFIX}QUERY_AURA"

        val SCHEMA_INPUT = """
            {"task":"select-transaction-schema","sheets":[{"id":"sheet-1","headerCandidates":[{"id":"header-1","dateCandidates":[{"id":"date-1"}],"amountCandidates":[{"id":"amount-1"}],"descriptionCandidateColumnIds":["column-description"]}]}]}
        """.trimIndent()

        val SCHEMA_JSON_SCHEMA = """
            {"type":"object","additionalProperties":false,"required":["status","sheetId","headerCandidateId","dateCandidateId","descriptionColumnIds","amountCandidateId"],"properties":{"status":{"enum":["resolved"]},"sheetId":{"enum":["sheet-1"]},"headerCandidateId":{"enum":["header-1"]},"dateCandidateId":{"enum":["date-1"]},"descriptionColumnIds":{"type":"array","items":{"enum":["column-description"]}},"amountCandidateId":{"enum":["amount-1"]}}}
        """.trimIndent()

        val CATEGORY_INPUT = """
            {"task":"classify-transaction-categories","categories":[{"id":"category-groceries","name":"Groceries"}],"items":[{"id":"group-1","description":"Market"}]}
        """.trimIndent()

        val CATEGORY_JSON_SCHEMA = """
            {"type":"object","additionalProperties":false,"required":["items"],"properties":{"items":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["id","categoryId"],"properties":{"id":{"enum":["group-1"]},"categoryId":{"enum":["category-groceries"]}}}}}}
        """.trimIndent()
    }
}
