package com.staituned.aura.paymentdetection.notification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.staituned.aura.paymentdetection.bridge.PaymentDetectionBridgeValidator
import com.staituned.aura.paymentdetection.data.PaymentCandidateRepository
import com.staituned.aura.paymentdetection.events.PaymentCandidateChange
import com.staituned.aura.paymentdetection.events.PaymentCandidateChangeReason
import com.staituned.aura.paymentdetection.events.PaymentCandidateEventBus
import java.util.concurrent.Executors

class PaymentCandidateActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != PaymentCandidateNotifier.ACTION_IGNORE_CANDIDATE) return
        val uri = intent.data ?: return
        if (
            uri.scheme != context.getString(com.staituned.aura.R.string.custom_url_scheme) ||
            uri.host != PaymentCandidateNotifier.DEEP_LINK_HOST ||
            uri.pathSegments.size != 2 ||
            uri.pathSegments.first() != PaymentCandidateNotifier.DEEP_LINK_CANDIDATE_SEGMENT ||
            uri.query != null ||
            uri.fragment != null
        ) {
            return
        }
        val candidateId = try {
            PaymentDetectionBridgeValidator.requireCandidateId(
                uri.pathSegments.lastOrNull(),
            )
        } catch (_: IllegalArgumentException) {
            return
        }
        val pendingResult = goAsync()
        executor.execute {
            try {
                PaymentCandidateRepository(context).ignore(candidateId)
                PaymentCandidateEventBus.publish(
                    PaymentCandidateChange(
                        PaymentCandidateChangeReason.IGNORED,
                        candidateId,
                    ),
                )
            } catch (_: RuntimeException) {
                // Missing, expired, wrong-owner, and storage failures are a
                // privacy-safe no-op from the notification action.
            } finally {
                PaymentCandidateNotifier(context).cancel(candidateId)
                pendingResult.finish()
            }
        }
    }

    companion object {
        private val executor = Executors.newSingleThreadExecutor()
    }
}
