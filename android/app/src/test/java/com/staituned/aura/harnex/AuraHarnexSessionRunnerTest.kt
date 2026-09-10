package com.staituned.aura.harnex

import io.github.daniele21.localllm.contracts.ConsumerActivation
import io.github.daniele21.localllm.contracts.ConsumerActivationId
import io.github.daniele21.localllm.contracts.ConsumerActivationRequest
import io.github.daniele21.localllm.contracts.ConsumerActivationResult
import io.github.daniele21.localllm.contracts.ConsumerAssignedUseCase
import io.github.daniele21.localllm.contracts.ConsumerAssignedUseCasesResult
import io.github.daniele21.localllm.contracts.ConsumerCapabilityResult
import io.github.daniele21.localllm.contracts.ConsumerContentType
import io.github.daniele21.localllm.contracts.ConsumerControlPlaneErrorCode
import io.github.daniele21.localllm.contracts.ConsumerControlPlaneFailure
import io.github.daniele21.localllm.contracts.ConsumerDeactivationResult
import io.github.daniele21.localllm.contracts.ConsumerErrorCode
import io.github.daniele21.localllm.contracts.ConsumerExecutionIdentity
import io.github.daniele21.localllm.contracts.ConsumerFailure
import io.github.daniele21.localllm.contracts.ConsumerGenerationEvent
import io.github.daniele21.localllm.contracts.ConsumerGenerationHandle
import io.github.daniele21.localllm.contracts.ConsumerGenerationListener
import io.github.daniele21.localllm.contracts.ConsumerGenerationRequest
import io.github.daniele21.localllm.contracts.ConsumerGenerationStartResult
import io.github.daniele21.localllm.contracts.ConsumerInferenceMetrics
import io.github.daniele21.localllm.contracts.ConsumerInferenceResult
import io.github.daniele21.localllm.contracts.ConsumerLimits
import io.github.daniele21.localllm.contracts.ConsumerOutputConstraintKind
import io.github.daniele21.localllm.contracts.ConsumerPrepareRequest
import io.github.daniele21.localllm.contracts.ConsumerPrepareResult
import io.github.daniele21.localllm.contracts.ConsumerPreparedId
import io.github.daniele21.localllm.contracts.ConsumerPreparedSelection
import io.github.daniele21.localllm.contracts.ConsumerPresetOption
import io.github.daniele21.localllm.contracts.ConsumerPublishedPreset
import io.github.daniele21.localllm.contracts.ConsumerPublishedPresetsResult
import io.github.daniele21.localllm.contracts.ConsumerReasoningCapability
import io.github.daniele21.localllm.contracts.ConsumerSessionResult
import io.github.daniele21.localllm.contracts.ConsumerStopReason
import io.github.daniele21.localllm.contracts.EffectiveConsumerReasoningMode
import io.github.daniele21.localllm.contracts.InferencePresetId
import io.github.daniele21.localllm.contracts.InferencePresetRef
import io.github.daniele21.localllm.contracts.RequestId
import io.github.daniele21.localllm.contracts.SessionId
import io.github.daniele21.localllm.contracts.SessionKind
import io.github.daniele21.localllm.contracts.UseCaseCapabilities
import io.github.daniele21.localllm.contracts.UseCaseId
import io.github.daniele21.localllm.contracts.UseCaseReadiness
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class AuraHarnexSessionRunnerTest {
    @Test
    fun `successful structured generation always closes session and deactivates`() {
        val fake = FakeAuraHarnexConsumerClient()
        val runner = AuraHarnexSessionRunner(fake)

        val result = runner.generate(USE_CASE, INPUT, SCHEMA)

        result as AuraHarnexGenerationOutcome.Completed
        assertEquals("{\"status\":\"resolved\"}", result.answer)
        assertEquals(listOf(SESSION_ID), fake.closedSessions)
        assertEquals(listOf(ACTIVATION_ID), fake.deactivatedActivations)
        assertFalse(fake.closed)
    }

    @Test
    fun `probe activates before capability discovery and releases activation`() {
        val fake = FakeAuraHarnexConsumerClient()
        val runner = AuraHarnexSessionRunner(fake)

        val result = runner.probe(USE_CASE)

        result as AuraHarnexCapabilityOutcome.Available
        assertEquals(12_000, result.capability.maxInputCharacters)
        assertEquals(4_096, result.capability.maxJsonSchemaCharacters)
        assertEquals(
            listOf("connect", "assigned", "published", "activate", "capabilities", "deactivate"),
            fake.lifecycleCalls,
        )
        assertEquals(listOf(ACTIVATION_ID), fake.deactivatedActivations)
    }

    @Test
    fun `host absent projects typed unavailable state without creating runtime resources`() {
        val fake = FakeAuraHarnexConsumerClient().apply {
            connectionOutcome = AuraHarnexConnectionOutcome.Unavailable(
                auraHarnexFailure(AuraHarnexFailureCode.HOST_NOT_INSTALLED),
            )
        }
        val runner = AuraHarnexSessionRunner(fake)

        val result = runner.probe(USE_CASE)

        result as AuraHarnexCapabilityOutcome.Unavailable
        assertEquals(AuraHarnexFailureCode.HOST_NOT_INSTALLED, result.failure.code)
        assertEquals(0, fake.activationCount)
        assertTrue(fake.closedSessions.isEmpty())
        assertTrue(fake.deactivatedActivations.isEmpty())
    }

    @Test
    fun `model unavailable after activation deactivates before failing`() {
        val fake = FakeAuraHarnexConsumerClient().apply {
            capabilities = capabilities(readiness = UseCaseReadiness.UNAVAILABLE_MODEL)
        }
        val runner = AuraHarnexSessionRunner(fake)

        val result = runner.generate(USE_CASE, INPUT, SCHEMA)

        result as AuraHarnexGenerationOutcome.Failed
        assertEquals(AuraHarnexFailureCode.MODEL_UNAVAILABLE, result.failure.code)
        assertEquals(1, fake.activationCount)
        assertEquals(listOf(ACTIVATION_ID), fake.deactivatedActivations)
        assertTrue(fake.closedSessions.isEmpty())
    }

    @Test
    fun `probe cleanup failure cannot be surfaced as available capability`() {
        val fake = FakeAuraHarnexConsumerClient().apply {
            deactivationResult = ConsumerDeactivationResult.Rejected(
                ConsumerControlPlaneFailure(
                    ConsumerControlPlaneErrorCode.RUNTIME_FAILURE,
                    "cleanup failed",
                ),
            )
        }
        val runner = AuraHarnexSessionRunner(fake)

        val result = runner.probe(USE_CASE)

        result as AuraHarnexCapabilityOutcome.Unavailable
        assertEquals(AuraHarnexFailureCode.RUNTIME_FAILURE, result.failure.code)
        assertEquals(1, fake.activationCount)
        assertEquals(listOf(ACTIVATION_ID), fake.deactivatedActivations)
    }

    @Test
    fun `prepare failure after activation still deactivates`() {
        val fake = FakeAuraHarnexConsumerClient().apply {
            prepareResult = ConsumerPrepareResult.Rejected(
                ConsumerFailure(ConsumerErrorCode.MODEL_UNAVAILABLE, "model unavailable"),
            )
        }
        val runner = AuraHarnexSessionRunner(fake)

        val result = runner.generate(USE_CASE, INPUT, SCHEMA)

        result as AuraHarnexGenerationOutcome.Failed
        assertEquals(AuraHarnexFailureCode.MODEL_UNAVAILABLE, result.failure.code)
        assertEquals(1, fake.activationCount)
        assertTrue(fake.closedSessions.isEmpty())
        assertEquals(listOf(ACTIVATION_ID), fake.deactivatedActivations)
    }

    @Test
    fun `cancellation cancels generation and releases session and activation`() {
        val fake = FakeAuraHarnexConsumerClient().apply {
            blockGenerationUntilCancelled = true
        }
        val runner = AuraHarnexSessionRunner(fake)
        val executor = Executors.newSingleThreadExecutor()
        try {
            val future = executor.submit<AuraHarnexGenerationOutcome> {
                runner.generate(USE_CASE, INPUT, SCHEMA)
            }
            assertTrue(fake.generationStarted.await(2, TimeUnit.SECONDS))

            assertTrue(runner.cancel())
            val result = future.get(2, TimeUnit.SECONDS)

            result as AuraHarnexGenerationOutcome.Failed
            assertEquals(AuraHarnexFailureCode.CANCELLED, result.failure.code)
            assertEquals(1, fake.cancelCount)
            assertEquals(listOf(SESSION_ID), fake.closedSessions)
            assertEquals(listOf(ACTIVATION_ID), fake.deactivatedActivations)
        } finally {
            executor.shutdownNow()
        }
    }

    @Test
    fun `cleanup failure cannot be surfaced as successful inference`() {
        val fake = FakeAuraHarnexConsumerClient().apply {
            deactivationResult = ConsumerDeactivationResult.Rejected(
                ConsumerControlPlaneFailure(
                    ConsumerControlPlaneErrorCode.RUNTIME_FAILURE,
                    "cleanup failed",
                ),
            )
        }
        val runner = AuraHarnexSessionRunner(fake)

        val result = runner.generate(USE_CASE, INPUT, SCHEMA)

        result as AuraHarnexGenerationOutcome.Failed
        assertEquals(AuraHarnexFailureCode.RUNTIME_FAILURE, result.failure.code)
        assertEquals(listOf(SESSION_ID), fake.closedSessions)
        assertEquals(listOf(ACTIVATION_ID), fake.deactivatedActivations)
    }

    @Test
    fun `close is terminal and closes the underlying Consumer client`() {
        val fake = FakeAuraHarnexConsumerClient()
        val runner = AuraHarnexSessionRunner(fake)

        runner.close()
        runner.close()

        assertTrue(fake.closed)
        val connection = runner.connect()
        connection as AuraHarnexConnectionOutcome.Unavailable
        assertEquals(AuraHarnexFailureCode.RUNTIME_FAILURE, connection.failure.code)
    }

    private class FakeAuraHarnexConsumerClient : AuraHarnexConsumerClient {
        var connectionOutcome: AuraHarnexConnectionOutcome = AuraHarnexConnectionOutcome.Connected
        var capabilities: UseCaseCapabilities = capabilities()
        var prepareResult: ConsumerPrepareResult = ConsumerPrepareResult.Prepared(PREPARED_SELECTION)
        var deactivationResult: ConsumerDeactivationResult = ConsumerDeactivationResult.Released
        var blockGenerationUntilCancelled: Boolean = false
        val generationStarted = CountDownLatch(1)
        val closedSessions = mutableListOf<SessionId>()
        val deactivatedActivations = mutableListOf<ConsumerActivationId>()
        val lifecycleCalls = mutableListOf<String>()
        var activationCount = 0
        var cancelCount = 0
        var closed = false

        override fun connect(timeoutMs: Long): AuraHarnexConnectionOutcome {
            lifecycleCalls += "connect"
            return connectionOutcome
        }

        override fun disconnect(): AuraHarnexFailure? = null

        override fun assignedUseCases(): ConsumerAssignedUseCasesResult {
            lifecycleCalls += "assigned"
            return ConsumerAssignedUseCasesResult.Available(
                listOf(
                    ConsumerAssignedUseCase(
                        useCaseId = USE_CASE.useCaseId,
                        useCaseRevision = 1,
                        bindingRevision = 1,
                        displayName = "Aura schema inference",
                        description = "Schema selection",
                        isDefault = true,
                    ),
                ),
            )
        }

        override fun publishedPresets(useCaseId: UseCaseId): ConsumerPublishedPresetsResult {
            lifecycleCalls += "published"
            return ConsumerPublishedPresetsResult.Available(
                useCaseId = useCaseId,
                bindingRevision = 1,
                presets = listOf(
                    ConsumerPublishedPreset(
                        preset = PRESET,
                        displayName = "Aura local structured inference",
                        description = "Host-owned structured preset",
                        isDefault = true,
                    ),
                ),
            )
        }

        override fun capabilities(useCaseId: UseCaseId): ConsumerCapabilityResult {
            lifecycleCalls += "capabilities"
            return ConsumerCapabilityResult.Available(capabilities)
        }

        override fun activate(request: ConsumerActivationRequest): ConsumerActivationResult {
            lifecycleCalls += "activate"
            activationCount += 1
            return ConsumerActivationResult.Activated(
                ConsumerActivation(
                    activationId = ACTIVATION_ID,
                    useCaseId = request.useCaseId,
                    useCaseRevision = request.useCaseRevision,
                    bindingRevision = request.bindingRevision,
                    preset = request.preset,
                ),
            )
        }

        override fun prepare(request: ConsumerPrepareRequest): ConsumerPrepareResult = prepareResult

        override fun createSession(preparedId: ConsumerPreparedId): ConsumerSessionResult =
            ConsumerSessionResult.Created(SESSION_ID)

        override fun generate(
            request: ConsumerGenerationRequest,
            listener: ConsumerGenerationListener,
        ): ConsumerGenerationStartResult {
            generationStarted.countDown()
            val handle = object : ConsumerGenerationHandle {
                override val requestId: RequestId = request.requestId

                override fun cancel() {
                    cancelCount += 1
                    listener.onEvent(
                        ConsumerGenerationEvent.Failed(
                            requestId,
                            ConsumerFailure(ConsumerErrorCode.CANCELLED, "cancelled"),
                        ),
                    )
                }
            }
            if (!blockGenerationUntilCancelled) {
                listener.onEvent(
                    ConsumerGenerationEvent.Completed(
                        request.requestId,
                        ConsumerInferenceResult(
                            answer = "{\"status\":\"resolved\"}",
                            surfacedReasoning = null,
                            metrics = ConsumerInferenceMetrics(
                                outputTokens = 4,
                                timeToFirstTokenMs = 3,
                                totalMs = 12,
                                decodeTokensPerSecond = 9.5,
                                inputTokens = 8,
                                reasoningTokens = 0,
                                answerTokens = 4,
                                queueMs = 1,
                                stopReason = ConsumerStopReason.GRAMMAR_COMPLETE,
                            ),
                            execution = ConsumerExecutionIdentity(
                                useCaseId = USE_CASE.useCaseId,
                                capabilityRevision = CAPABILITY_REVISION,
                                preset = PRESET,
                                reasoningMode = EffectiveConsumerReasoningMode.DISABLED,
                                outputConstraint = ConsumerOutputConstraintKind.JSON_SCHEMA,
                                sessionKind = SessionKind.STATELESS,
                            ),
                        ),
                    ),
                )
            }
            return ConsumerGenerationStartResult.Accepted(handle)
        }

        override fun closeSession(sessionId: SessionId) {
            closedSessions += sessionId
        }

        override fun deactivate(activationId: ConsumerActivationId): ConsumerDeactivationResult {
            lifecycleCalls += "deactivate"
            deactivatedActivations += activationId
            return deactivationResult
        }

        override fun close() {
            closed = true
        }
    }

    private companion object {
        val USE_CASE = AuraHarnexUseCase.SCHEMA_INFERENCE
        val PRESET = InferencePresetRef(InferencePresetId("qwen35-json"), 1)
        val ACTIVATION_ID = ConsumerActivationId("activation-1")
        val SESSION_ID = SessionId("session-1")
        val PREPARED_SELECTION = ConsumerPreparedSelection(
            preparedId = ConsumerPreparedId("prepared-1"),
            useCaseId = USE_CASE.useCaseId,
            capabilityRevision = CAPABILITY_REVISION,
            preset = PRESET,
            reasoningMode = EffectiveConsumerReasoningMode.DISABLED,
            outputConstraint = ConsumerOutputConstraintKind.JSON_SCHEMA,
            sessionKind = SessionKind.STATELESS,
        )
        const val CAPABILITY_REVISION = "aura-transaction-import-v1"
        const val INPUT = "{\"columns\":[]}"
        const val SCHEMA = "{\"type\":\"object\"}"

        fun capabilities(readiness: UseCaseReadiness = UseCaseReadiness.READY) = UseCaseCapabilities(
            useCaseId = USE_CASE.useCaseId,
            readiness = readiness,
            presets = listOf(ConsumerPresetOption(PRESET, isDefault = true)),
            defaultPreset = PRESET,
            reasoning = ConsumerReasoningCapability.NOT_SUPPORTED,
            outputConstraints = setOf(ConsumerOutputConstraintKind.JSON_SCHEMA),
            defaultOutputConstraint = ConsumerOutputConstraintKind.JSON_SCHEMA,
            sessionKinds = setOf(SessionKind.STATELESS),
            defaultSessionKind = SessionKind.STATELESS,
            limits = ConsumerLimits(
                maxInputCharacters = 12_000,
                maxConversationMessages = 1,
                maxJsonSchemaCharacters = 4_096,
            ),
            capabilityRevision = CAPABILITY_REVISION,
        )
    }
}
