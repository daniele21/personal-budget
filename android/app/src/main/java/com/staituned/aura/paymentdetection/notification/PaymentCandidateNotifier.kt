package com.staituned.aura.paymentdetection.notification

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.app.NotificationCompat
import com.staituned.aura.MainActivity
import com.staituned.aura.R

internal class PaymentCandidateNotifier(private val context: Context) {
    private val notificationManager =
        context.getSystemService(NotificationManager::class.java)

    fun notifyCandidate(candidateId: String): Boolean {
        if (
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return false
        }
        return runCatching {
            ensureChannel()
            notificationManager.notify(
                candidateId,
                PAYMENT_CANDIDATE_NOTIFICATION_ID,
                privateNotification(candidateId),
            )
            true
        }.getOrDefault(false)
    }

    fun cancel(candidateId: String) {
        notificationManager.cancel(
            candidateId,
            PAYMENT_CANDIDATE_NOTIFICATION_ID,
        )
    }

    fun cancelAll() {
        notificationManager.activeNotifications
            .filter { it.notification.channelId == CHANNEL_ID }
            .forEach { notification ->
                notificationManager.cancel(notification.tag, notification.id)
            }
    }

    fun candidateUri(candidateId: String): Uri =
        Uri.Builder()
            .scheme(context.getString(R.string.custom_url_scheme))
            .authority(DEEP_LINK_HOST)
            .appendPath(DEEP_LINK_CANDIDATE_SEGMENT)
            .appendPath(candidateId)
            .build()

    private fun ensureChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.payment_candidate_channel_name),
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description =
                context.getString(R.string.payment_candidate_channel_description)
            lockscreenVisibility = Notification.VISIBILITY_PRIVATE
            setShowBadge(true)
        }
        notificationManager.createNotificationChannel(channel)
    }

    private fun privateNotification(candidateId: String): Notification {
        val verifyIntent = PendingIntent.getActivity(
            context,
            VERIFY_REQUEST_CODE,
            Intent(context, MainActivity::class.java)
                .setAction(ACTION_VERIFY_CANDIDATE)
                .setData(candidateUri(candidateId))
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val ignoreIntent = PendingIntent.getBroadcast(
            context,
            IGNORE_REQUEST_CODE,
            Intent(context, PaymentCandidateActionReceiver::class.java)
                .setAction(ACTION_IGNORE_CANDIDATE)
                .setData(candidateUri(candidateId)),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val publicVersion = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_aura_notification)
            .setContentTitle(context.getString(R.string.app_name))
            .setContentText(
                context.getString(R.string.payment_candidate_notification_text),
            )
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()

        return NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_aura_notification)
            .setContentTitle(context.getString(R.string.app_name))
            .setContentText(
                context.getString(R.string.payment_candidate_notification_text),
            )
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setPublicVersion(publicVersion)
            .setContentIntent(verifyIntent)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .addAction(
                R.drawable.ic_aura_notification,
                context.getString(R.string.payment_candidate_verify_action),
                verifyIntent,
            )
            .addAction(
                R.drawable.ic_aura_notification,
                context.getString(R.string.payment_candidate_ignore_action),
                ignoreIntent,
            )
            .build()
    }

    companion object {
        internal const val CHANNEL_ID = "aura_payment_candidates_v1"
        internal const val PAYMENT_CANDIDATE_NOTIFICATION_ID = 7_301
        internal const val ACTION_VERIFY_CANDIDATE =
            "com.staituned.aura.action.VERIFY_PAYMENT_CANDIDATE"
        internal const val ACTION_IGNORE_CANDIDATE =
            "com.staituned.aura.action.IGNORE_PAYMENT_CANDIDATE"
        internal const val DEEP_LINK_HOST = "open"
        internal const val DEEP_LINK_CANDIDATE_SEGMENT = "payment-candidates"
        private const val VERIFY_REQUEST_CODE = 7_311
        private const val IGNORE_REQUEST_CODE = 7_312
    }
}
