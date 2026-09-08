package com.staituned.aura.harnex

import android.content.Context
import com.staituned.aura.BuildConfig
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
import io.github.daniele21.localllm.transport.binder.client.BinderConsumerLocalLlmClient
import io.github.daniele21.localllm.transport.binder.client.SharedRuntimeConnectionObserver
import io.github.daniele21.localllm.transport.binder.client.SharedRuntimeConnectionSnapshot
import io.github.daniele21.localllm.transport.binder.client.SharedRuntimeConnectionState
import io.github.daniele21.localllm.transport.binder.client.SharedRuntimeHostConfig
import java.util.concurrent.TimeUnit

internal class BinderAuraHarnexConsumerClient(context: Context) : AuraHarnexConsumerClient {
    private val stateMonitor = java.lang.Object()

    @Volatile
    private var connectionSnapshot = SharedRuntimeConnectionSnapshot(SharedRuntimeConnectionState.DISCONNECTED)

    private val client = BinderConsumerLocalLlmClient.create(
        context = context.applicationContext,
        hostConfig = SharedRuntimeHostConfig.create(BuildConfig.HARNEX_HOST_PACKAGE, HARNEX_HOST_SERVICE),
        clientBuildId = "aura-${BuildConfig.VERSION_NAME}",
        observer = SharedRuntimeConnectionObserver { snapshot ->
            synchronized(stateMonitor) {
                connectionSnapshot = snapshot
                stateMonitor.notifyAll()
            }
        },
    )

    override fun connect(timeoutMs: Long): AuraHarnexConnectionOutcome = runCatching {
        client.connect()
        awaitConnection(timeoutMs)
    }.getOrElse {
        AuraHarnexConnectionOutcome.Unavailable(auraHarnexFailure(AuraHarnexFailureCode.RUNTIME_FAILURE))
    }

    override fun disconnect(): AuraHarnexFailure? = runCatching {
        client.disconnect()
        null
    }.getOrElse {
        auraHarnexFailure(AuraHarnexFailureCode.RUNTIME_FAILURE)
    }

    override fun assignedUseCases(): ConsumerAssignedUseCasesResult = client.assignedUseCases()

    override fun publishedPresets(useCaseId: UseCaseId): ConsumerPublishedPresetsResult = client.publishedPresets(useCaseId)

    override fun capabilities(useCaseId: UseCaseId): ConsumerCapabilityResult = client.capabilities(useCaseId)

    override fun activate(request: ConsumerActivationRequest): ConsumerActivationResult = client.activate(request)

    override fun prepare(request: ConsumerPrepareRequest): ConsumerPrepareResult = client.prepare(request)

    override fun createSession(preparedId: ConsumerPreparedId): ConsumerSessionResult = client.createSession(preparedId)

    override fun generate(
        request: ConsumerGenerationRequest,
        listener: ConsumerGenerationListener,
    ): ConsumerGenerationStartResult = client.generate(request, listener)

    override fun closeSession(sessionId: SessionId) {
        client.closeSession(sessionId)
    }

    override fun deactivate(activationId: ConsumerActivationId): ConsumerDeactivationResult = client.deactivate(activationId)

    override fun close() {
        client.close()
    }

    private fun awaitConnection(timeoutMs: Long): AuraHarnexConnectionOutcome {
        val deadlineNanos = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs)
        while (true) {
            terminalConnectionOutcome(connectionSnapshot)?.let { return it }
            val remainingNanos = deadlineNanos - System.nanoTime()
            if (remainingNanos <= 0) {
                return AuraHarnexConnectionOutcome.Unavailable(
                    auraHarnexFailure(AuraHarnexFailureCode.CONNECTION_TIMEOUT),
                )
            }
            synchronized(stateMonitor) {
                if (terminalConnectionOutcome(connectionSnapshot) == null) {
                    stateMonitor.wait(maxOf(1L, TimeUnit.NANOSECONDS.toMillis(remainingNanos)))
                }
            }
        }
    }
}

private fun terminalConnectionOutcome(snapshot: SharedRuntimeConnectionSnapshot): AuraHarnexConnectionOutcome? =
    when (snapshot.state) {
        SharedRuntimeConnectionState.CONNECTED -> AuraHarnexConnectionOutcome.Connected
        SharedRuntimeConnectionState.HOST_NOT_INSTALLED -> unavailable(AuraHarnexFailureCode.HOST_NOT_INSTALLED)
        SharedRuntimeConnectionState.PERMISSION_DENIED -> unavailable(AuraHarnexFailureCode.UNAUTHORIZED)
        SharedRuntimeConnectionState.INCOMPATIBLE -> unavailable(AuraHarnexFailureCode.INCOMPATIBLE)
        SharedRuntimeConnectionState.CONNECTION_LOST -> unavailable(AuraHarnexFailureCode.CONNECTION_LOST)
        SharedRuntimeConnectionState.CLOSED -> unavailable(AuraHarnexFailureCode.RUNTIME_FAILURE)
        SharedRuntimeConnectionState.DISCONNECTED,
        SharedRuntimeConnectionState.BINDING,
        SharedRuntimeConnectionState.NEGOTIATING,
        -> null
    }

private fun unavailable(code: AuraHarnexFailureCode) =
    AuraHarnexConnectionOutcome.Unavailable(auraHarnexFailure(code))

private const val HARNEX_HOST_SERVICE = "io.github.daniele21.localllm.phonetest.HarnessSharedRuntimeService"
