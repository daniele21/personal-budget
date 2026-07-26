package com.staituned.aura.paymentdetection.security

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SecureOpaqueIdTest {
    @Test
    fun createsUnpredictableUrlSafeIdentifiers() {
        val identifiers = (1..256).map { SecureOpaqueId.create() }

        assertEquals(identifiers.size, identifiers.toSet().size)
        assertTrue(identifiers.all { it.length == 24 })
        assertTrue(identifiers.all { it.matches(Regex("^[A-Za-z0-9_-]+$")) })
    }
}
