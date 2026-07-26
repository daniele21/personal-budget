package com.staituned.aura

import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialInterruptedException
import androidx.credentials.exceptions.GetCredentialProviderConfigurationException
import androidx.credentials.exceptions.GetCredentialUnknownException
import androidx.credentials.exceptions.GetCredentialUnsupportedException
import androidx.credentials.exceptions.NoCredentialException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeGoogleAuthDiagnosticsTest {
    @Test
    fun `classifies expected credential outcomes`() {
        assertEquals(
            NativeGoogleAuthFailure(
                code = "AUTH_CANCELLED",
                userMessage = "Google sign-in was cancelled.",
                expected = true,
            ),
            classifyNativeGoogleAuthFailure(GetCredentialCancellationException()),
        )
        assertEquals(
            NativeGoogleAuthFailure(
                code = "AUTH_NO_CREDENTIAL",
                userMessage = "No Google credential is available.",
                expected = true,
            ),
            classifyNativeGoogleAuthFailure(NoCredentialException()),
        )
    }

    @Test
    fun `classifies actionable provider failures`() {
        assertEquals(
            "AUTH_PROVIDER_CONFIGURATION",
            classifyNativeGoogleAuthFailure(
                GetCredentialProviderConfigurationException(),
            ).code,
        )
        assertEquals(
            "AUTH_CREDENTIAL_UNSUPPORTED",
            classifyNativeGoogleAuthFailure(
                GetCredentialUnsupportedException(),
            ).code,
        )
        assertEquals(
            "AUTH_CREDENTIAL_INTERRUPTED",
            classifyNativeGoogleAuthFailure(
                GetCredentialInterruptedException(),
            ).code,
        )
        assertEquals(
            "AUTH_CREDENTIAL_UNKNOWN",
            classifyNativeGoogleAuthFailure(
                GetCredentialUnknownException(),
            ).code,
        )
    }

    @Test
    fun `diagnostic output excludes exception messages and limits stack frames`() {
        val exception = GetCredentialUnknownException(
            "secret-token user@example.com",
        )
        exception.stackTrace = Array(30) { index ->
            StackTraceElement("Example$index", "run", "Example.kt", index + 1)
        }

        val diagnostic = formatNativeGoogleAuthDiagnostic(
            stage = "credential_manager",
            code = "AUTH_CREDENTIAL_UNKNOWN",
            exception = exception,
        )

        assertTrue(diagnostic.contains("stage=credential_manager"))
        assertTrue(diagnostic.contains("code=AUTH_CREDENTIAL_UNKNOWN"))
        assertTrue(diagnostic.contains("exception=GetCredentialUnknownException"))
        assertFalse(diagnostic.contains("secret-token"))
        assertFalse(diagnostic.contains("user@example.com"))
        assertTrue(diagnostic.contains("Example23"))
        assertFalse(diagnostic.contains("Example24"))
    }
}
