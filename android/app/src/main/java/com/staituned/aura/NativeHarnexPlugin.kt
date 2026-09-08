package com.staituned.aura

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.staituned.aura.harnex.AuraHarnexCapabilityOutcome
import com.staituned.aura.harnex.AuraHarnexConnectionOutcome
import com.staituned.aura.harnex.AuraHarnexDisconnectOutcome
import com.staituned.aura.harnex.AuraHarnexFailure
import com.staituned.aura.harnex.AuraHarnexFailureCode
import com.staituned.aura.harnex.AuraHarnexGenerationOutcome
import com.staituned.aura.harnex.AuraHarnexSessionRunner
import com.staituned.aura.harnex.AuraHarnexUseCase
import com.staituned.aura.harnex.BinderAuraHarnexConsumerClient
import com.staituned.aura.harnex.auraHarnexFailure
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException

@CapacitorPlugin(name = "NativeHarnex")
class NativeHarnexPlugin : Plugin() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var runner: AuraHarnexSessionRunner

    override fun load() {
        super.load()
        runner = AuraHarnexSessionRunner(BinderAuraHarnexConsumerClient(context))
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        submit(call) { connectionToJs(runner.connect()) }
    }

    @PluginMethod
    fun probe(call: PluginCall) {
        val useCase = AuraHarnexUseCase.fromWireId(call.getString("useCaseId"))
        if (useCase == null) {
            call.resolve(capabilityToJs(AuraHarnexCapabilityOutcome.Unavailable(invalidRequestFailure())))
            return
        }
        submit(call) { capabilityToJs(runner.probe(useCase)) }
    }

    @PluginMethod
    fun generate(call: PluginCall) {
        val useCase = AuraHarnexUseCase.fromWireId(call.getString("useCaseId"))
        val input = call.getString("input")
        val jsonSchema = call.getString("jsonSchema")
        if (
            useCase == null ||
            input.isNullOrBlank() ||
            jsonSchema.isNullOrBlank() ||
            input.length > MAX_BRIDGE_INPUT_CHARACTERS ||
            jsonSchema.length > MAX_BRIDGE_JSON_SCHEMA_CHARACTERS
        ) {
            call.resolve(generationToJs(AuraHarnexGenerationOutcome.Failed(invalidRequestFailure())))
            return
        }
        submit(call) { generationToJs(runner.generate(useCase, input, jsonSchema)) }
    }

    @PluginMethod
    fun cancel(call: PluginCall) {
        val cancelled = if (this::runner.isInitialized) runner.cancel() else false
        call.resolve(JSObject().put("cancelled", cancelled))
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        if (!this::runner.isInitialized) {
            call.resolve(JSObject().put("status", "disconnected"))
            return
        }
        submit(call) { disconnectToJs(runner.disconnect()) }
    }

    override fun handleOnDestroy() {
        if (this::runner.isInitialized) runner.close()
        executor.shutdownNow()
        super.handleOnDestroy()
    }

    private fun submit(call: PluginCall, operation: () -> JSObject) {
        try {
            executor.execute {
                val result = runCatching(operation).getOrElse {
                    operationFailureToJs(auraHarnexFailure(AuraHarnexFailureCode.RUNTIME_FAILURE))
                }
                call.resolve(result)
            }
        } catch (_: RejectedExecutionException) {
            call.resolve(operationFailureToJs(auraHarnexFailure(AuraHarnexFailureCode.RUNTIME_FAILURE)))
        }
    }
}

private fun connectionToJs(outcome: AuraHarnexConnectionOutcome): JSObject = when (outcome) {
    AuraHarnexConnectionOutcome.Connected -> JSObject().put("status", "connected")
    is AuraHarnexConnectionOutcome.Unavailable -> JSObject()
        .put("status", "unavailable")
        .put("failure", failureToJs(outcome.failure))
}

private fun capabilityToJs(outcome: AuraHarnexCapabilityOutcome): JSObject = when (outcome) {
    is AuraHarnexCapabilityOutcome.Available -> JSObject()
        .put("status", "available")
        .put("maxInputCharacters", outcome.capability.maxInputCharacters)
        .put("maxJsonSchemaCharacters", outcome.capability.maxJsonSchemaCharacters)

    is AuraHarnexCapabilityOutcome.Unavailable -> JSObject()
        .put("status", "unavailable")
        .put("failure", failureToJs(outcome.failure))
}

private fun generationToJs(outcome: AuraHarnexGenerationOutcome): JSObject = when (outcome) {
    is AuraHarnexGenerationOutcome.Completed -> {
        val metrics = JSObject().put("totalMs", outcome.metrics.totalMs)
        outcome.metrics.timeToFirstTokenMs?.let { metrics.put("timeToFirstTokenMs", it) }
        outcome.metrics.outputTokens?.let { metrics.put("outputTokens", it) }
        outcome.metrics.decodeTokensPerSecond?.let { metrics.put("decodeTokensPerSecond", it) }
        JSObject()
            .put("status", "completed")
            .put("answer", outcome.answer)
            .put("metrics", metrics)
    }

    is AuraHarnexGenerationOutcome.Failed -> JSObject()
        .put("status", "failed")
        .put("failure", failureToJs(outcome.failure))
}

private fun disconnectToJs(outcome: AuraHarnexDisconnectOutcome): JSObject = when (outcome) {
    AuraHarnexDisconnectOutcome.Disconnected -> JSObject().put("status", "disconnected")
    is AuraHarnexDisconnectOutcome.Failed -> operationFailureToJs(outcome.failure)
}

private fun operationFailureToJs(failure: AuraHarnexFailure): JSObject = JSObject()
    .put("status", "failed")
    .put("failure", failureToJs(failure))

private fun failureToJs(failure: AuraHarnexFailure): JSObject = JSObject()
    .put("code", failure.code.name)
    .put("message", failure.message)

private fun invalidRequestFailure() = auraHarnexFailure(AuraHarnexFailureCode.INVALID_REQUEST)

private const val MAX_BRIDGE_INPUT_CHARACTERS = 12_000
private const val MAX_BRIDGE_JSON_SCHEMA_CHARACTERS = 4_096
