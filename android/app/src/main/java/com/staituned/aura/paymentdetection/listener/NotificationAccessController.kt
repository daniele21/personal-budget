package com.staituned.aura.paymentdetection.listener

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.service.notification.NotificationListenerService

internal data class NotificationListenerAccessState(
    val currentGranted: Boolean,
    val legacyGranted: Boolean,
) {
    val anyGranted: Boolean
        get() = currentGranted || legacyGranted

    val migrationRequired: Boolean
        get() = legacyGranted && !currentGranted

    val effectiveGeneration: PaymentListenerGeneration?
        get() = when {
            currentGranted -> PaymentListenerGeneration.CURRENT
            legacyGranted -> PaymentListenerGeneration.LEGACY
            else -> null
        }
}

internal class NotificationAccessController(private val context: Context) {
    private val currentListenerComponent =
        ComponentName(context, AuraNotificationListenerServiceV2::class.java)
    private val legacyListenerComponent =
        ComponentName(context, AuraNotificationListenerService::class.java)

    fun state(): NotificationListenerAccessState {
        val enabled = enabledListenerComponents()
        return NotificationListenerAccessState(
            currentGranted = currentListenerComponent in enabled,
            legacyGranted = legacyListenerComponent in enabled,
        )
    }

    fun isGranted(): Boolean = state().anyGranted

    fun isCurrentGranted(): Boolean = state().currentGranted

    fun migrationRequired(): Boolean = state().migrationRequired

    fun effectiveGeneration(): PaymentListenerGeneration? =
        state().effectiveGeneration

    fun isEffectiveListenerConnected(): Boolean =
        effectiveGeneration()?.let(PaymentDetectionListenerRuntime::isConnected)
            ?: false

    fun requestRebindIfGranted(): Boolean {
        val component = effectiveComponent() ?: return false
        return requestRebind(component)
    }

    /**
     * Repairs a stale "connected" listener by cycling the exact component that
     * owns the effective grant. Aura targets API 36, where static
     * requestUnbind(ComponentName) is available.
     */
    fun forceRebindIfGranted(): Boolean {
        val component = effectiveComponent() ?: return false
        return try {
            NotificationListenerService.requestUnbind(component)
            NotificationListenerService.requestRebind(component)
            true
        } catch (_: RuntimeException) {
            requestRebind(component)
        }
    }

    fun requestLegacyUnbindIfCurrentGranted(): Boolean {
        val access = state()
        if (!access.currentGranted || !access.legacyGranted) return false
        return try {
            NotificationListenerService.requestUnbind(legacyListenerComponent)
            true
        } catch (_: RuntimeException) {
            false
        }
    }

    /**
     * Always opens the current V2 component. Existing installs that still have
     * only the legacy listener grant therefore receive an explicit one-time
     * path to a fresh OS filter configuration.
     */
    fun openSettings(): Boolean {
        val detailIntent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS)
            .putExtra(
                Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                currentListenerComponent.flattenToString(),
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

    private fun effectiveComponent(): ComponentName? =
        when (state().effectiveGeneration) {
            PaymentListenerGeneration.CURRENT -> currentListenerComponent
            PaymentListenerGeneration.LEGACY -> legacyListenerComponent
            null -> null
        }

    private fun requestRebind(component: ComponentName): Boolean =
        try {
            NotificationListenerService.requestRebind(component)
            true
        } catch (_: RuntimeException) {
            false
        }

    private fun enabledListenerComponents(): Set<ComponentName> {
        val enabled = Settings.Secure.getString(
            context.contentResolver,
            ENABLED_NOTIFICATION_LISTENERS,
        ) ?: return emptySet()
        return enabled.split(':')
            .mapNotNull(ComponentName::unflattenFromString)
            .toSet()
    }

    companion object {
        private const val ENABLED_NOTIFICATION_LISTENERS =
            "enabled_notification_listeners"
    }
}
