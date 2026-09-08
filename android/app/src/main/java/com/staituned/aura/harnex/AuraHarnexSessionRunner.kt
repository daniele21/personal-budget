package com.staituned.aura.harnex

import io.github.daniele21.localllm.contracts.ConsumerActivationRequest
import io.github.daniele21.localllm.contracts.ConsumerActivationResult
import io.github.daniele21.localllm.contracts.ConsumerAssignedUseCase
import io.github.daniele21.localllm.contracts.ConsumerAssignedUseCasesResult
import io.github.daniele21.localllm.contracts.ConsumerCapabilityErrorCode
import io.github.daniele21.localllm.contracts.ConsumerCapabilityResult
import io.github.daniele21.localllm.contracts.ConsumerControlPlaneErrorCode
import io.github.daniele21.localllm.contracts.ConsumerDeactivationResult
import io.github.daniele21.localllm.contracts.ConsumerErrorCode
import io.github.daniele21.localllm.contracts.ConsumerGenerationEvent
import io.github.daniele21.localllm.contracts.ConsumerGenerationHandle
import io.github.daniele21.localllm.contracts.ConsumerGenerationInput
import io.github.daniele21.localllm.contracts.ConsumerGenerationListener
import io.github.daniele21.localllm.contracts.ConsumerGenerationRequest
import io.github.daniele21.localllm.contracts.ConsumerGenerationStartResult
import io.github.daniele21.localllm.contracts.ConsumerOutputConstraint
import io.github.daniele21.localllm.contracts.ConsumerOutputConstraintKind
import io.github.daniele21.localllm.contracts.ConsumerPrepareRequest
import io.github.daniele21.localllm.contracts.ConsumerPrepareResult
import io.github.daniele21.localllm.contracts.ConsumerPublishedPresetsResult
import io.github.daniele21.localllm.contracts.ConsumerReasoningCapability
import io.github.daniele21.localllm.contracts.ConsumerSelectionRequest
import io.github.daniele21.localllm.contracts.ConsumerSessionResult
import io.github.daniele21.localllm.contracts.EffectiveConsumerReasoningMode
import io.github.daniele21.localllm.contracts.RequestId
import io.github.daniele21.localllm.contracts.SessionId
import io.github.daniele21.localllm.contracts.SessionKind
import io.github.daniele21.localllm.contracts.UseCaseCapabilities
import io.github.daniele21.localllm.contracts.UseCaseReadiness
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

internal class AuraHarnexSessionRunner(
    private val client: AuraHarnexConsumerClient,
) : AutoCloseable {
    private val running = AtomicBoolean(false)
    private val closed = AtomicBoolean(false)
    private val cancelRequested = AtomicBoolean(false)

    @Volatile
    private var activeHandle: ConsumerGenerationHandle? = null

    @Volatile
    private var activeSession: SessionId? = null

    @Volatile
    private var activeActivation: io.github.daniele21.localllm.contracts.ConsumerActivationId? = null

    fun connect(): AuraHarnexConnectionOutcome = if (closed.get()) {
        unavailableConnection(AuraHarnexFailureCode.RUNTIME_FAILURE)
    } else {
        client.connect(CONNECTION_TIMEOUT_MS)
    }

    fun probe(useCase: AuraHarnexUseCase): AuraHarnexCapabilityOutcome = when (val discovery = discover(useCase)) {
        is DiscoveryOutcome.Available -> AuraHarnexCapabilityOutcome.Available(
            AuraHarnexCapability(
                maxInputCharacters = discovery.capabilities.limits.maxInputCharacters,
                maxJsonSchemaCharacters = discovery.capabilities.limits.maxJsonSchemaCharacters,
            ),
        )

        is DiscoveryOutcome.Failed -> AuraHarnexCapabilityOutcome.Unavailable(discovery.failure)
    }

    fun generate(
        useCase: AuraHarnexUseCase,
        input: String,
        jsonSchema: String,
    ): AuraHarnexGenerationOutcome {
        if (closed.get()) return failed(AuraHarnexFailureCode.RUNTIME_FAILURE)
        if (!running.compareAndSet(false, true)) return failed(AuraHarnexFailureCode.BUSY)
        cancelRequested.set(false)

        val outcome = try {
            executeGeneration(useCase, input, jsonSchema)
        } catch (_: InterruptedException) {
            Thread.currentThread().interrupt()
            activeHandle?.let { runCatching { it.cancel() } }
            failed(AuraHarnexFailureCode.CANCELLED)
        } catch (_: Throwable) {
            failed(AuraHarnexFailureCode.RUNTIME_FAILURE)
        }
        val cleanupFailure = cleanupResources()
        running.set(false)
        return if (outcome is AuraHarnexGenerationOutcome.Completed && cleanupFailure != null) {
            AuraHarnexGenerationOutcome.Failed(cleanupFailure)
        } else {
            outcome
        }
    }

    fun cancel(): Boolean {
        if (!running.get()) return false
        cancelRequested.set(true)
        activeHandle?.let { runCatching { it.cancel() } }
        return true
    }

    fun disconnect(): AuraHarnexDisconnectOutcome {
        if (closed.get()) return AuraHarnexDisconnectOutcome.Failed(auraHarnexFailure(AuraHarnexFailureCode.RUNTIME_FAILURE))
        if (running.get()) return AuraHarnexDisconnectOutcome.Failed(auraHarnexFailure(AuraHarnexFailureCode.BUSY))
        val failure = client.disconnect()
        return if (failure == null) {
            AuraHarnexDisconnectOutcome.Disconnected
        } else {
            AuraHarnexDisconnectOutcome.Failed(failure)
        }
    }

    override fun close() {
        if (!closed.compareAndSet(false, true)) return
        cancel()
        runCatching { client.close() }
    }

    private fun executeGeneration(
        useCase: AuraHarnexUseCase,
        input: String,
        jsonSchema: String,
    ): AuraHarnexGenerationOutcome {
        if (input.isBlank() || jsonSchema.isBlank() || '\u0000' in input || '\u0000' in jsonSchema) {
            return failed(AuraHarnexFailureCode.INVALID_REQUEST)
        }
        val discovery = when (val result = discover(useCase)) {
            is DiscoveryOutcome.Available -> result
            is DiscoveryOutcome.Failed -> return AuraHarnexGenerationOutcome.Failed(result.failure)
        }
        if (
            input.length > discovery.capabilities.limits.maxInputCharacters ||
            jsonSchema.length > discovery.capabilities.limits.maxJsonSchemaCharacters
        ) {
            return failed(AuraHarnexFailureCode.INVALID_REQUEST)
        }
        cancellationFailure()?.let { return it }

        val published = when (val result = client.publishedPresets(useCase.useCaseId)) {
            is ConsumerPublishedPresetsResult.Available -> result
            is ConsumerPublishedPresetsResult.Rejected -> return failed(mapControlPlaneFailure(result.failure.code))
        }
        if (published.bindingRevision != discovery.assignment.bindingRevision) {
            return failed(AuraHarnexFailureCode.CAPABILITY_CHANGED)
        }
        val defaultPresets = published.presets.filter { it.isDefault }
        if (defaultPresets.size != 1) return failed(AuraHarnexFailureCode.USE_CASE_UNAVAILABLE)
        val defaultPreset = defaultPresets.single().preset

        val activation = when (
            val result = client.activate(
                ConsumerActivationRequest(
                    useCaseId = useCase.useCaseId,
                    useCaseRevision = discovery.assignment.useCaseRevision,
                    bindingRevision = discovery.assignment.bindingRevision,
                    preset = defaultPreset,
                ),
            )
        ) {
            is ConsumerActivationResult.Activated -> result.activation
            is ConsumerActivationResult.Rejected -> return failed(mapControlPlaneFailure(result.failure.code))
        }
        activeActivation = activation.activationId
        cancellationFailure()?.let { return it }

        val prepared = when (
            val result = client.prepare(
                ConsumerPrepareRequest(
                    useCaseId = useCase.useCaseId,
                    selection = ConsumerSelectionRequest(
                        capabilityRevision = discovery.capabilities.capabilityRevision,
                        preset = defaultPreset,
                    ),
                ),
            )
        ) {
            is ConsumerPrepareResult.Prepared -> result.selection
            is ConsumerPrepareResult.Rejected -> return failed(mapConsumerFailure(result.failure.code))
        }
        if (
            prepared.useCaseId != useCase.useCaseId ||
            prepared.capabilityRevision != discovery.capabilities.capabilityRevision ||
            prepared.preset != defaultPreset ||
            prepared.reasoningMode != EffectiveConsumerReasoningMode.DISABLED ||
            prepared.outputConstraint != ConsumerOutputConstraintKind.JSON_SCHEMA ||
            prepared.sessionKind != SessionKind.STATELESS
        ) {
            return failed(AuraHarnexFailureCode.CAPABILITY_CHANGED)
        }
        cancellationFailure()?.let { return it }

        val sessionId = when (val result = client.createSession(prepared.preparedId)) {
            is ConsumerSessionResult.Created -> result.sessionId
            is ConsumerSessionResult.Rejected -> return failed(mapConsumerFailure(result.failure.code))
        }
        activeSession = sessionId
        cancellationFailure()?.let { return it }

        return awaitGeneration(
            sessionId = sessionId,
            input = input,
            jsonSchema = jsonSchema,
        )
    }

    private fun discover(useCase: AuraHarnexUseCase): DiscoveryOutcome {
        if (closed.get()) return DiscoveryOutcome.Failed(auraHarnexFailure(AuraHarnexFailureCode.RUNTIME_FAILURE))
        when (val connection = client.connect(CONNECTION_TIMEOUT_MS)) {
            AuraHarnexConnectionOutcome.Connected -> Unit
            is AuraHarnexConnectionOutcome.Unavailable -> return DiscoveryOutcome.Failed(connection.failure)
        }
        val assignment = when (val result = client.assignedUseCases()) {
            is ConsumerAssignedUseCasesResult.Available -> {
                val matches = result.assignments.filter { it.useCaseId == useCase.useCaseId }
                when (matches.size) {
                    0 -> return DiscoveryOutcome.Failed(auraHarnexFailure(AuraHarnexFailureCode.USE_CASE_NOT_ASSIGNED))
                    1 -> matches.single()
                    else -> return DiscoveryOutcome.Failed(auraHarnexFailure(AuraHarnexFailureCode.RUNTIME_FAILURE))
                }
            }

            is ConsumerAssignedUseCasesResult.Rejected ->
                return DiscoveryOutcome.Failed(auraHarnexFailure(mapControlPlaneFailure(result.failure.code)))
        }
        val capabilities = when (val result = client.capabilities(useCase.useCaseId)) {
            is ConsumerCapabilityResult.Available -> result.capabilities
            is ConsumerCapabilityResult.Rejected ->
                return DiscoveryOutcome.Failed(auraHarnexFailure(mapCapabilityFailure(result.code)))
        }
        validateCapabilities(useCase, capabilities)?.let { return DiscoveryOutcome.Failed(it) }
        return DiscoveryOutcome.Available(assignment, capabilities)
    }

    private fun awaitGeneration(
        sessionId: SessionId,
        input: String,
        jsonSchema: String,
    ): AuraHarnexGenerationOutcome {
        val requestId = RequestId("aura-${UUID.randomUUID()}")
        val terminal = CountDownLatch(1)
        val outcome = AtomicReference<AuraHarnexGenerationOutcome?>()
        val request = ConsumerGenerationRequest(
            requestId = requestId,
            sessionId = sessionId,
            input = ConsumerGenerationInput.Text(input),
            outputConstraint = ConsumerOutputConstraint.JsonSchema(jsonSchema),
        )
        val start = client.generate(
            request,
            ConsumerGenerationListener { event ->
                if (event.requestId != requestId || outcome.get() != null) return@ConsumerGenerationListener
                when (event) {
                    is ConsumerGenerationEvent.Completed -> {
                        if (
                            outcome.compareAndSet(
                                null,
                                AuraHarnexGenerationOutcome.Completed(
                                    answer = event.answer,
                                    metrics = AuraHarnexMetrics(
                                        totalMs = event.metrics.totalMs,
                                        timeToFirstTokenMs = event.metrics.timeToFirstTokenMs,
                                        outputTokens = event.metrics.outputTokens,
                                        decodeTokensPerSecond = event.metrics.decodeTokensPerSecond,
                                    ),
                                ),
                            )
                        ) {
                            terminal.countDown()
                        }
                    }

                    is ConsumerGenerationEvent.Failed -> {
                        if (outcome.compareAndSet(null, failed(mapConsumerFailure(event.failure.code)))) {
                            terminal.countDown()
                        }
                    }

                    is ConsumerGenerationEvent.Queued,
                    is ConsumerGenerationEvent.Prepared,
                    is ConsumerGenerationEvent.Started,
                    is ConsumerGenerationEvent.ContentDelta,
                    -> Unit
                }
            },
        )
        when (start) {
            is ConsumerGenerationStartResult.Accepted -> {
                activeHandle = start.handle
                if (cancelRequested.get()) runCatching { start.handle.cancel() }
            }

            is ConsumerGenerationStartResult.Rejected -> return failed(mapConsumerFailure(start.failure.code))
        }
        terminal.await()
        return outcome.get() ?: failed(AuraHarnexFailureCode.RUNTIME_FAILURE)
    }

    private fun cleanupResources(): AuraHarnexFailure? {
        activeHandle = null
        var failed = false
        activeSession?.let { sessionId ->
            if (runCatching { client.closeSession(sessionId) }.isFailure) failed = true
        }
        activeSession = null
        activeActivation?.let { activationId ->
            val result = runCatching { client.deactivate(activationId) }.getOrNull()
            if (result !is ConsumerDeactivationResult.Released) failed = true
        }
        activeActivation = null
        return if (failed) auraHarnexFailure(AuraHarnexFailureCode.RUNTIME_FAILURE) else null
    }

    private fun cancellationFailure(): AuraHarnexGenerationOutcome.Failed? =
        if (cancelRequested.get()) failed(AuraHarnexFailureCode.CANCELLED) else null
}

private sealed interface DiscoveryOutcome {
    data class Available(
        val assignment: ConsumerAssignedUseCase,
        val capabilities: UseCaseCapabilities,
    ) : DiscoveryOutcome

    data class Failed(val failure: AuraHarnexFailure) : DiscoveryOutcome
}

private fun validateCapabilities(
    useCase: AuraHarnexUseCase,
    capabilities: UseCaseCapabilities,
): AuraHarnexFailure? {
    if (capabilities.useCaseId != useCase.useCaseId) return auraHarnexFailure(AuraHarnexFailureCode.INCOMPATIBLE)
    when (capabilities.readiness) {
        UseCaseReadiness.UNAVAILABLE_MODEL -> return auraHarnexFailure(AuraHarnexFailureCode.MODEL_UNAVAILABLE)
        UseCaseReadiness.UNAVAILABLE_HOST_POLICY -> return auraHarnexFailure(AuraHarnexFailureCode.USE_CASE_UNAVAILABLE)
        UseCaseReadiness.INCOMPATIBLE -> return auraHarnexFailure(AuraHarnexFailureCode.INCOMPATIBLE)
        UseCaseReadiness.READY,
        UseCaseReadiness.AVAILABLE_REQUIRES_PREPARATION,
        -> Unit
    }
    if (
        capabilities.defaultOutputConstraint != ConsumerOutputConstraintKind.JSON_SCHEMA ||
        ConsumerOutputConstraintKind.JSON_SCHEMA !in capabilities.outputConstraints ||
        capabilities.defaultSessionKind != SessionKind.STATELESS ||
        SessionKind.STATELESS !in capabilities.sessionKinds ||
        capabilities.reasoning != ConsumerReasoningCapability.NOT_SUPPORTED
    ) {
        return auraHarnexFailure(AuraHarnexFailureCode.INCOMPATIBLE)
    }
    return null
}

private fun mapControlPlaneFailure(code: ConsumerControlPlaneErrorCode): AuraHarnexFailureCode = when (code) {
    ConsumerControlPlaneErrorCode.FEATURE_UNAVAILABLE -> AuraHarnexFailureCode.INCOMPATIBLE
    ConsumerControlPlaneErrorCode.UNKNOWN_APPLICATION,
    ConsumerControlPlaneErrorCode.APPLICATION_NOT_AUTHORIZED,
    -> AuraHarnexFailureCode.UNAUTHORIZED
    ConsumerControlPlaneErrorCode.USE_CASE_NOT_ASSIGNED -> AuraHarnexFailureCode.USE_CASE_NOT_ASSIGNED
    ConsumerControlPlaneErrorCode.PRESET_NOT_EXPOSED,
    ConsumerControlPlaneErrorCode.CONFIGURATION_REQUIRED,
    -> AuraHarnexFailureCode.USE_CASE_UNAVAILABLE
    ConsumerControlPlaneErrorCode.STALE_REVISION -> AuraHarnexFailureCode.CAPABILITY_CHANGED
    ConsumerControlPlaneErrorCode.MODEL_UNAVAILABLE -> AuraHarnexFailureCode.MODEL_UNAVAILABLE
    ConsumerControlPlaneErrorCode.ACTIVATION_ALREADY_ACTIVE -> AuraHarnexFailureCode.BUSY
    ConsumerControlPlaneErrorCode.INVALID_REQUEST -> AuraHarnexFailureCode.INVALID_REQUEST
    ConsumerControlPlaneErrorCode.TRANSPORT_FAILURE -> AuraHarnexFailureCode.CONNECTION_LOST
    ConsumerControlPlaneErrorCode.MODEL_CONFLICT,
    ConsumerControlPlaneErrorCode.RUNTIME_FAILURE,
    -> AuraHarnexFailureCode.RUNTIME_FAILURE
}

private fun mapCapabilityFailure(code: ConsumerCapabilityErrorCode): AuraHarnexFailureCode = when (code) {
    ConsumerCapabilityErrorCode.USE_CASE_NOT_ALLOWED -> AuraHarnexFailureCode.USE_CASE_NOT_ASSIGNED
    ConsumerCapabilityErrorCode.STALE_CAPABILITY -> AuraHarnexFailureCode.CAPABILITY_CHANGED
    ConsumerCapabilityErrorCode.MODEL_UNAVAILABLE -> AuraHarnexFailureCode.MODEL_UNAVAILABLE
    ConsumerCapabilityErrorCode.CAPABILITY_INCOMPATIBLE,
    ConsumerCapabilityErrorCode.REASONING_NOT_ALLOWED,
    ConsumerCapabilityErrorCode.REASONING_REQUIRED,
    ConsumerCapabilityErrorCode.OUTPUT_NOT_ALLOWED,
    ConsumerCapabilityErrorCode.SESSION_KIND_NOT_ALLOWED,
    -> AuraHarnexFailureCode.INCOMPATIBLE
    ConsumerCapabilityErrorCode.PRESET_NOT_ALLOWED -> AuraHarnexFailureCode.USE_CASE_UNAVAILABLE
}

private fun mapConsumerFailure(code: ConsumerErrorCode): AuraHarnexFailureCode = when (code) {
    ConsumerErrorCode.USE_CASE_NOT_ALLOWED -> AuraHarnexFailureCode.USE_CASE_NOT_ASSIGNED
    ConsumerErrorCode.STALE_CAPABILITY,
    ConsumerErrorCode.PREPARED_SELECTION_STALE,
    -> AuraHarnexFailureCode.CAPABILITY_CHANGED
    ConsumerErrorCode.MODEL_UNAVAILABLE -> AuraHarnexFailureCode.MODEL_UNAVAILABLE
    ConsumerErrorCode.CAPABILITY_INCOMPATIBLE,
    ConsumerErrorCode.REASONING_NOT_ALLOWED,
    ConsumerErrorCode.REASONING_REQUIRED,
    ConsumerErrorCode.OUTPUT_NOT_ALLOWED,
    ConsumerErrorCode.SESSION_KIND_NOT_ALLOWED,
    -> AuraHarnexFailureCode.INCOMPATIBLE
    ConsumerErrorCode.PRESET_NOT_ALLOWED -> AuraHarnexFailureCode.USE_CASE_UNAVAILABLE
    ConsumerErrorCode.INVALID_INPUT -> AuraHarnexFailureCode.INVALID_REQUEST
    ConsumerErrorCode.CANCELLED -> AuraHarnexFailureCode.CANCELLED
    ConsumerErrorCode.PREPARE_FAILED,
    ConsumerErrorCode.PREPARED_SELECTION_NOT_FOUND,
    ConsumerErrorCode.SESSION_NOT_FOUND,
    ConsumerErrorCode.RUNTIME_FAILURE,
    -> AuraHarnexFailureCode.RUNTIME_FAILURE
}

private fun failed(code: AuraHarnexFailureCode) = AuraHarnexGenerationOutcome.Failed(auraHarnexFailure(code))

private fun unavailableConnection(code: AuraHarnexFailureCode) =
    AuraHarnexConnectionOutcome.Unavailable(auraHarnexFailure(code))

private const val CONNECTION_TIMEOUT_MS = 10_000L
