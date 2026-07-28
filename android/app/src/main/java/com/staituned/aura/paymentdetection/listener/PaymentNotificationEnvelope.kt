package com.staituned.aura.paymentdetection.listener

import android.app.Notification

internal data class PaymentNotificationEnvelope(
    val title: String?,
    val text: String?,
    val bigText: String?,
    val postedAtEpochMillis: Long,
)

internal object PaymentNotificationEnvelopeReader {
    private const val MAX_FIELD_CHARACTERS = 512

    fun read(
        notification: Notification,
        postedAtEpochMillis: Long,
    ): PaymentNotificationEnvelope {
        val extras = notification.extras
        return PaymentNotificationEnvelope(
            title = bounded(extras.getCharSequence(Notification.EXTRA_TITLE)),
            text = bounded(extras.getCharSequence(Notification.EXTRA_TEXT)),
            bigText = bounded(extras.getCharSequence(Notification.EXTRA_BIG_TEXT)),
            postedAtEpochMillis = postedAtEpochMillis,
        )
    }

    private fun bounded(value: CharSequence?): String? =
        value?.toString()?.take(MAX_FIELD_CHARACTERS)
}
