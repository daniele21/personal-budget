package com.staituned.aura

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import androidx.core.app.NotificationCompat

@CapacitorPlugin(
    name = "NativeLocalNotifications",
    permissions = [
        Permission(
            alias = "postNotifications",
            strings = [Manifest.permission.POST_NOTIFICATIONS],
        ),
    ],
)
class NativeLocalNotificationsPlugin : Plugin() {
    private val allowedRoutes = setOf(
        "/",
        "/budgets",
        "/planning",
        "/planning/recurring",
        "/profile",
        "/settings",
        "/data",
    )

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        if (getPermissionState(PERMISSION_ALIAS) == PermissionState.GRANTED) {
            call.resolve(JSObject().put("granted", true))
            return
        }
        requestPermissionForAlias(PERMISSION_ALIAS, call, "permissionCallback")
    }

    @PermissionCallback
    private fun permissionCallback(call: PluginCall) {
        call.resolve(
            JSObject().put(
                "granted",
                getPermissionState(PERMISSION_ALIAS) == PermissionState.GRANTED,
            ),
        )
    }

    @PluginMethod
    fun deliver(call: PluginCall) {
        if (getPermissionState(PERMISSION_ALIAS) != PermissionState.GRANTED) {
            call.resolve(JSObject().put("delivered", false))
            return
        }

        val id = call.getString("id")?.takeIf { ID_PATTERN.matches(it) }
            ?: return call.reject("Invalid notification id.", "INVALID_ID")
        val title = call.getString("title")?.trim()?.takeIf { it.isNotEmpty() }?.take(MAX_TITLE)
            ?: return call.reject("Invalid notification title.", "INVALID_TITLE")
        val body = call.getString("body")?.trim()?.takeIf { it.isNotEmpty() }?.take(MAX_BODY)
            ?: return call.reject("Invalid notification body.", "INVALID_BODY")
        val route = call.getString("route")?.takeIf { allowedRoutes.contains(it) } ?: "/"
        call.getString("dedupeKey")?.takeIf { DEDUPE_PATTERN.matches(it) }
            ?: return call.reject("Invalid notification dedupe key.", "INVALID_DEDUPE_KEY")
        // The stable id is the Android tag as well as the cancellation key.
        // Dedupe validation remains explicit, while cancellation never depends
        // on the caller remembering a second identifier.
        val tag = id

        ensureChannel()
        val manager = context.getSystemService(NotificationManager::class.java)
        val intent = Intent(context, MainActivity::class.java)
            .setAction(Intent.ACTION_VIEW)
            .setData(appUri(route))
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val pendingIntent = PendingIntent.getActivity(
            context,
            tag.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val publicVersion = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_aura_notification)
            .setContentTitle(context.getString(R.string.app_name))
            .setContentText(context.getString(R.string.local_reminder_public_text))
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_aura_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setPublicVersion(publicVersion)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .build()
        manager.notify(tag, NOTIFICATION_ID, notification)
        call.resolve(JSObject().put("delivered", true))
    }

    @PluginMethod
    fun cancel(call: PluginCall) {
        val id = call.getString("id")?.takeIf { ID_PATTERN.matches(it) }
            ?: return call.reject("Invalid notification id.", "INVALID_ID")
        context.getSystemService(NotificationManager::class.java)
            .cancel(id, NOTIFICATION_ID)
        call.resolve()
    }

    @PluginMethod
    fun cancelAll(call: PluginCall) {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.activeNotifications
            .filter { it.notification.channelId == CHANNEL_ID }
            .forEach { manager.cancel(it.tag, it.id) }
        call.resolve()
    }

    private fun appUri(route: String): Uri = Uri.Builder()
        .scheme(context.getString(R.string.custom_url_scheme))
        .authority("open")
        .path(route)
        .build()

    private fun ensureChannel() {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.local_reminder_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = context.getString(R.string.local_reminder_channel_description)
                lockscreenVisibility = Notification.VISIBILITY_PRIVATE
                setShowBadge(true)
            },
        )
    }

    companion object {
        private const val PERMISSION_ALIAS = "postNotifications"
        private const val CHANNEL_ID = "aura_local_reminders_v1"
        private const val NOTIFICATION_ID = 7302
        private const val MAX_TITLE = 80
        private const val MAX_BODY = 180
        private val ID_PATTERN = Regex("^[A-Za-z0-9:_-]{1,160}$")
        private val DEDUPE_PATTERN = Regex("^[A-Za-z0-9:._-]{1,200}$")
    }
}
