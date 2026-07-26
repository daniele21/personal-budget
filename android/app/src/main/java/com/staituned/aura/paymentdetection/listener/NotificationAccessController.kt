package com.staituned.aura.paymentdetection.listener

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings

internal class NotificationAccessController(private val context: Context) {
    private val listenerComponent =
        ComponentName(context, AuraNotificationListenerService::class.java)

    fun isGranted(): Boolean {
        val enabled = Settings.Secure.getString(
            context.contentResolver,
            ENABLED_NOTIFICATION_LISTENERS,
        ) ?: return false
        return enabled.split(':')
            .mapNotNull(ComponentName::unflattenFromString)
            .any { it == listenerComponent }
    }

    fun openSettings(): Boolean {
        val detailIntent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS)
            .putExtra(
                Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                listenerComponent.flattenToString(),
            )
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val fallbackIntent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val intent = when {
            detailIntent.resolveActivity(context.packageManager) != null -> detailIntent
            fallbackIntent.resolveActivity(context.packageManager) != null -> fallbackIntent
            else -> return false
        }
        context.startActivity(intent)
        return true
    }

    companion object {
        private const val ENABLED_NOTIFICATION_LISTENERS =
            "enabled_notification_listeners"
    }
}
