package com.staituned.aura.paymentdetection.service

import org.junit.Assert.assertEquals
import org.junit.Test

class RecoverySchedulingDecisionTest {
    @Test
    fun transientSettingsReadFailurePreservesAlreadyScheduledRecovery() {
        assertEquals(
            RecoverySchedulingDecision.PRESERVE_EXISTING,
            recoverySchedulingDecision(null),
        )
    }

    @Test
    fun explicitDisabledOrUnownedDetectionCancelsRecovery() {
        assertEquals(
            RecoverySchedulingDecision.DISABLE,
            recoverySchedulingDecision(false),
        )
    }

    @Test
    fun explicitlyEnabledDetectionSchedulesRecovery() {
        assertEquals(
            RecoverySchedulingDecision.ENABLE,
            recoverySchedulingDecision(true),
        )
    }
}
