package com.staituned.aura.harnex

import android.util.Log
import io.github.daniele21.localllm.contracts.ConsumerActivationId
import io.github.daniele21.localllm.contracts.ConsumerActivationRequest
import io.github.daniele21.localllm.contracts.ConsumerActivationResult
import io.github.daniele21.localllm.contracts.ConsumerAssignedUseCasesResult
import io.github.daniele21.localllm.contracts.ConsumerCapabilityResult
import io.github.daniele21.localllm.contracts.ConsumerDeactivationResult
import io.github.daniele21.localllm.contracts.ConsumerGenerationEvent
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

/** Evidence-only decorator: emits lifecycle stage/result codes without logging request content. */
internal class EvidenceLoggingAuraHarnexConsumerClient(
    private val delegate: AuraHarnexConsumerClient,
) : AuraHarnexConsumerClient by delegate {
    override fun assignedUseCases(): ConsumerAssignedUseCasesResult =
        delegate.assignedUseCases().also { Log.i(TAG, "stage=assigned_use_cases result=$it") }

    override fun publishedPresets(useCaseId: UseCaseId): ConsumerPublishedPresetsResult =
        delegate.publishedPresets(useCaseId).also {
            Log.i(TAG, "stage=published_presets use_case=${useCaseId.value} result=$it")
        }

    override fun capabilities(useCaseId: UseCaseId): ConsumerCapabilityResult =
        delegate.capabilities(useCaseId).also {
            Log.i(TAG, "stage=capabilities use_case=${useCaseId.value} result=$it")
        }

    override fun activate(request: ConsumerActivationRequest): ConsumerActivationResult =
        delegate.activate(request).also {
            Log.i(TAG, "stage=activate use_case=${request.useCaseId.value} result=$it")
        }

    override fun prepare(request: ConsumerPrepareRequest): ConsumerPrepareResult =
        delegate.prepare(request).also {
            Log.i(TAG, "stage=prepare use_case=${request.useCaseId.value} result=$it")
        }

    override fun createSession(preparedId: ConsumerPreparedId): ConsumerSessionResult =
        delegate.createSession(preparedId).also {
            Log.i(TAG, "stage=create_session prepared_id=${preparedId.value} result=$it")
        }

    override fun generate(
        request: ConsumerGenerationRequest,
        listener: ConsumerGenerationListener,
    ): ConsumerGenerationStartResult {
        val result = delegate.generate(
            request,
            ConsumerGenerationListener { event ->
                when (event) {
                    is ConsumerGenerationEvent.Failed -> Log.e(
                        TAG,
                        "stage=generation_event request_id=${event.requestId.value} code=${event.failure.code}",
                    )

                    is ConsumerGenerationEvent.Completed -> Log.i(
                        TAG,
                        "stage=generation_event_completed request_id=${event.requestId.value}",
                    )

                    else -> Unit
                }
                listener.onEvent(event)
            },
        )
        Log.i(TAG, "stage=generate_start request_id=${request.requestId.value} result=$result")
        return result
    }

    override fun closeSession(sessionId: SessionId) {
        runCatching { delegate.closeSession(sessionId) }
            .onSuccess { Log.i(TAG, "stage=close_session session_id=${sessionId.value} result=success") }
            .onFailure { Log.e(TAG, "stage=close_session session_id=${sessionId.value} result=exception", it) }
            .getOrThrow()
    }

    override fun deactivate(activationId: ConsumerActivationId): ConsumerDeactivationResult =
        runCatching { delegate.deactivate(activationId) }
            .onSuccess { Log.i(TAG, "stage=deactivate activation_id=${activationId.value} result=$it") }
            .onFailure { Log.e(TAG, "stage=deactivate activation_id=${activationId.value} result=exception", it) }
            .getOrThrow()

    companion object {
        private const val TAG = "AuraHarnexEvidence"
    }
}
