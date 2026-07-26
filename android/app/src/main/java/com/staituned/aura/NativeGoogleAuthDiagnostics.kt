package com.staituned.aura

import android.content.Context
import android.content.pm.ApplicationInfo
import android.util.Log
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.GetCredentialInterruptedException
import androidx.credentials.exceptions.GetCredentialProviderConfigurationException
import androidx.credentials.exceptions.GetCredentialUnknownException
import androidx.credentials.exceptions.GetCredentialUnsupportedException
import androidx.credentials.exceptions.NoCredentialException

internal data class NativeGoogleAuthFailure(
    val code: String,
    val userMessage: String,
    val expected: Boolean = false,
)

internal fun classifyNativeGoogleAuthFailure(
    exception: GetCredentialException,
): NativeGoogleAuthFailure =
    when (exception) {
        is GetCredentialCancellationException ->
            NativeGoogleAuthFailure(
                code = "AUTH_CANCELLED",
                userMessage = "Google sign-in was cancelled.",
                expected = true,
            )
        is NoCredentialException ->
            NativeGoogleAuthFailure(
                code = "AUTH_NO_CREDENTIAL",
                userMessage = "No Google credential is available.",
                expected = true,
            )
        is GetCredentialProviderConfigurationException ->
            NativeGoogleAuthFailure(
                code = "AUTH_PROVIDER_CONFIGURATION",
                userMessage = "Google credential provider is not configured.",
            )
        is GetCredentialUnsupportedException ->
            NativeGoogleAuthFailure(
                code = "AUTH_CREDENTIAL_UNSUPPORTED",
                userMessage = "Google sign-in is not supported on this device.",
            )
        is GetCredentialInterruptedException ->
            NativeGoogleAuthFailure(
                code = "AUTH_CREDENTIAL_INTERRUPTED",
                userMessage = "Google sign-in was interrupted. Please try again.",
            )
        is GetCredentialUnknownException ->
            NativeGoogleAuthFailure(
                code = "AUTH_CREDENTIAL_UNKNOWN",
                userMessage = "Google sign-in failed.",
            )
        else ->
            NativeGoogleAuthFailure(
                code = "AUTH_NATIVE_FAILED",
                userMessage = "Google sign-in failed.",
            )
    }

internal fun formatNativeGoogleAuthDiagnostic(
    stage: String,
    code: String,
    exception: Throwable? = null,
): String {
    val exceptionName = exception?.javaClass?.simpleName ?: "none"
    val header = "stage=$stage code=$code exception=$exceptionName"
    if (exception == null) return header

    // Deliberately omit exception messages and causes: provider messages are
    // not part of Aura's data contract and could contain identifiers.
    val frames = exception.stackTrace
        .take(24)
        .joinToString(separator = "\n") { frame -> "\tat $frame" }
    return if (frames.isEmpty()) header else "$header\n$frames"
}

internal object NativeGoogleAuthDiagnostics {
    const val TAG = "AuraGoogleAuth"

    fun report(
        context: Context,
        stage: String,
        code: String,
        exception: Throwable? = null,
        expected: Boolean = false,
    ) {
        if (!context.applicationInfo.isDebuggable()) return

        val diagnostic = formatNativeGoogleAuthDiagnostic(
            stage = stage,
            code = code,
            exception = if (expected) null else exception,
        )
        if (expected) {
            Log.w(TAG, diagnostic)
        } else {
            Log.e(TAG, diagnostic)
        }
    }

    private fun ApplicationInfo.isDebuggable(): Boolean =
        flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
}
