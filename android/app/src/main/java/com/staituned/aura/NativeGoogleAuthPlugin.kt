package com.staituned.aura

import android.os.CancellationSignal
import androidx.core.content.ContextCompat
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialManagerCallback
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.ClearCredentialException
import androidx.credentials.exceptions.GetCredentialException
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException

@CapacitorPlugin(name = "NativeGoogleAuth")
class NativeGoogleAuthPlugin : Plugin() {
    private val credentialManager: CredentialManager by lazy {
        CredentialManager.create(context)
    }

    @PluginMethod
    fun signIn(call: PluginCall) {
        val serverClientId = readGeneratedWebClientId()
        if (serverClientId == null) {
            NativeGoogleAuthDiagnostics.report(
                context = context,
                stage = "android_configuration",
                code = "AUTH_CONFIG_MISSING",
            )
            call.reject(
                "Google authentication is not configured for Android.",
                "AUTH_CONFIG_MISSING",
            )
            return
        }

        val googleOption = GetSignInWithGoogleOption.Builder(serverClientId).build()
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleOption)
            .build()

        credentialManager.getCredentialAsync(
            activity,
            request,
            CancellationSignal(),
            ContextCompat.getMainExecutor(context),
            object : CredentialManagerCallback<GetCredentialResponse, GetCredentialException> {
                override fun onResult(result: GetCredentialResponse) {
                    resolveGoogleCredential(call, result)
                }

                override fun onError(e: GetCredentialException) {
                    val failure = classifyNativeGoogleAuthFailure(e)
                    NativeGoogleAuthDiagnostics.report(
                        context = context,
                        stage = "credential_manager",
                        code = failure.code,
                        exception = e,
                        expected = failure.expected,
                    )
                    call.reject(failure.userMessage, failure.code)
                }
            },
        )
    }

    private fun readGeneratedWebClientId(): String? {
        val resourceId = context.resources.getIdentifier(
            "default_web_client_id",
            "string",
            context.packageName,
        )
        if (resourceId == 0) return null

        return context.getString(resourceId).trim().takeIf(String::isNotEmpty)
    }

    @PluginMethod
    fun signOut(call: PluginCall) {
        credentialManager.clearCredentialStateAsync(
            ClearCredentialStateRequest(),
            CancellationSignal(),
            ContextCompat.getMainExecutor(context),
            object : CredentialManagerCallback<Void?, ClearCredentialException> {
                override fun onResult(result: Void?) {
                    call.resolve()
                }

                override fun onError(e: ClearCredentialException) {
                    NativeGoogleAuthDiagnostics.report(
                        context = context,
                        stage = "sign_out",
                        code = "AUTH_CLEAR_FAILED",
                        exception = e,
                    )
                    call.reject(
                        "Unable to clear the native credential state.",
                        "AUTH_CLEAR_FAILED",
                    )
                }
            },
        )
    }

    private fun resolveGoogleCredential(
        call: PluginCall,
        response: GetCredentialResponse,
    ) {
        val credential = response.credential
        if (
            credential !is CustomCredential ||
            credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
            NativeGoogleAuthDiagnostics.report(
                context = context,
                stage = "credential_parse",
                code = "AUTH_UNSUPPORTED_CREDENTIAL",
            )
            call.reject("Unsupported credential type.", "AUTH_UNSUPPORTED_CREDENTIAL")
            return
        }

        try {
            val googleCredential = GoogleIdTokenCredential.createFrom(credential.data)
            call.resolve(JSObject().put("idToken", googleCredential.idToken))
        } catch (exception: GoogleIdTokenParsingException) {
            NativeGoogleAuthDiagnostics.report(
                context = context,
                stage = "credential_parse",
                code = "AUTH_INVALID_CREDENTIAL",
                exception = exception,
            )
            call.reject("Invalid Google credential response.", "AUTH_INVALID_CREDENTIAL")
        }
    }
}
