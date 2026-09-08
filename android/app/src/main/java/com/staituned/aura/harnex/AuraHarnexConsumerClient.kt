package com.staituned.aura.harnex

import io.github.daniele21.localllm.contracts.ConsumerActivationId
import io.github.daniele21.localllm.contracts.ConsumerActivationRequest
import io.github.daniele21.localllm.contracts.ConsumerActivationResult
import io.github.daniele21.localllm.contracts.ConsumerAssignedUseCasesResult
import io.github.daniele21.localllm.contracts.ConsumerCapabilityResult
import io.github.daniele21.localllm.contracts.ConsumerDeactivationResult
import io.github.daniele21.localllm.contracts.ConsumerGenerationListener
import io.github.daniele21.localllm.contracts.ConsumerGenerationRequest
import io.github.daniele21.localllm.contracts.ConsumerGenerationStartResult
import io.github.daniele21.localllm.contracts.ConsumerPrepareRequest
import io.github.daniele21.localllm.contracts.ConsumerPrepareResult
import io.github.daniele21.localllm.contracts.ConsumerPreparedId
import io.github.daniele21.localllm.contracts.ConsumerPublishedPresetsResult
import io.github.daniele21.localllm.contracts.ConsumerSessionResult
import io.github.daniele21.localllm.contracts.SessionId
import io.github.daniele21.localllm.contracts.UseCaseId

internal enum class AuraHarnexUseCase(val wireId: String) {
    SCHEMA_INFERENCE("aura-transaction-schema-inference"),
    CATEGORY_CLASSIFICATION("aura-transaction-category-classification"),
    ;

    val useCaseId: UseCaseId
        get() = UseCaseId(wireId)

    companion object {
        fun fromWireId(value: String?): AuraHarnexUseCase? = entries.firstOrNull { it.wireId == value }
    }
}

internal enum class AuraHarnexFailureCode {
    HOST_NOT_INSTALLED,
    UNAUTHORIZED,
    INCOMPATIBLE,
    CONNECTION_LOST,
    CONNECTION_TIMEOUT,
    USE_CASE_NOT_ASSIGNED,
    USE_CASE_UNAVAILABLE,
    MODEL_UNAVAILABLE,
    CAPABILITY_CHANGED,
    INVALID_REQUEST,
    BUSY,
    CANCELLED,
    RUNTIME_FAILURE,
}

internal data class AuraHarnexFailure(
    val code: AuraHarnexFailureCode,
    val message: String,
)

internal sealed interface AuraHarnexConnectionOutcome {
    data object Connected : AuraHarnexConnectionOutcome

    data class Unavailable(val failure: AuraHarnexFailure) : AuraHarnexConnectionOutcome
}

internal data class AuraHarnexCapability(
    val maxInputCharacters: Int,
    val maxJsonSchemaCharacters: Int,
)

internal sealed interface AuraHarnexCapabilityOutcome {
    data class Available(val capability: AuraHarnexCapability) : AuraHarnexCapabilityOutcome

    data class Unavailable(val failure: AuraHarnexFailure) : AuraHarnexCapabilityOutcome
}

internal data class AuraHarnexMetrics(
    val totalMs: Long,
    val timeToFirstTokenMs: Long?,
    val outputTokens: Int?,
    val decodeTokensPerSecond: Double?,
)

internal sealed interface AuraHarnexGenerationOutcome {
    data class Completed(
        val answer: String,
        val metrics: AuraHarnexMetrics,
    ) : AuraHarnexGenerationOutcome

    data class Failed(val failure: AuraHarnexFailure) : AuraHarnexGenerationOutcome
}

internal sealed interface AuraHarnexDisconnectOutcome {
    data object Disconnected : AuraHarnexDisconnectOutcome

    data class Failed(val failure: AuraHarnexFailure) : AuraHarnexDisconnectOutcome
}

internal interface AuraHarnexConsumerClient : AutoCloseable {
    fun connect(timeoutMs: Long): AuraHarnexConnectionOutcome

    fun disconnect(): AuraHarnexFailure?

    fun assignedUseCases(): ConsumerAssignedUseCasesResult

    fun publishedPresets(useCaseId: UseCaseId): ConsumerPublishedPresetsResult

    fun capabilities(useCaseId: UseCaseId): ConsumerCapabilityResult

    fun activate(request: ConsumerActivationRequest): ConsumerActivationResult

    fun prepare(request: ConsumerPrepareRequest): ConsumerPrepareResult

    fun createSession(preparedId: ConsumerPreparedId): ConsumerSessionResult

    fun generate(
        request: ConsumerGenerationRequest,
        listener: ConsumerGenerationListener,
    ): ConsumerGenerationStartResult

    fun closeSession(sessionId: SessionId)

    fun deactivate(activationId: ConsumerActivationId): ConsumerDeactivationResult
}

internal fun auraHarnexFailure(code: AuraHarnexFailureCode): AuraHarnexFailure = AuraHarnexFailure(
    code = code,
    message = when (code) {
        AuraHarnexFailureCode.HOST_NOT_INSTALLED -> "Harnex is not installed on this device."
        AuraHarnexFailureCode.UNAUTHORIZED -> "Aura is not authorized to use Harnex."
        AuraHarnexFailureCode.INCOMPATIBLE -> "The installed Harnex runtime is incompatible with this Aura capability."
        AuraHarnexFailureCode.CONNECTION_LOST -> "The local Harnex connection was lost."
        AuraHarnexFailureCode.CONNECTION_TIMEOUT -> "The local Harnex connection did not become ready."
        AuraHarnexFailureCode.USE_CASE_NOT_ASSIGNED -> "This Harnex capability is not assigned to Aura."
        AuraHarnexFailureCode.USE_CASE_UNAVAILABLE -> "This Harnex capability is currently unavailable."
        AuraHarnexFailureCode.MODEL_UNAVAILABLE -> "The local model required by this Harnex capability is unavailable."
        AuraHarnexFailureCode.CAPABILITY_CHANGED -> "The Harnex capability changed while Aura was preparing the request."
        AuraHarnexFailureCode.INVALID_REQUEST -> "Aura rejected the local Harnex request before inference."
        AuraHarnexFailureCode.BUSY -> "Aura already has a local Harnex request in progress."
        AuraHarnexFailureCode.CANCELLED -> "The local Harnex request was cancelled."
        AuraHarnexFailureCode.RUNTIME_FAILURE -> "The local Harnex request failed."
    },
)
