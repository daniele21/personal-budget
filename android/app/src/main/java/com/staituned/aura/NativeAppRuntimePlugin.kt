package com.staituned.aura

import android.content.Intent
import android.os.SystemClock
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "NativeAppRuntime")
class NativeAppRuntimePlugin : Plugin() {
    private var pendingAppUrl: String? = null

    override fun load() {
        super.load()
        captureAppUrl(activity.intent, notify = false)
    }

    override fun handleOnNewIntent(intent: Intent) {
        captureAppUrl(intent, notify = true)
    }

    override fun handleOnResume() {
        notifyListeners(
            "appResumed",
            JSObject().put("sequence", SystemClock.elapsedRealtime()),
        )
    }

    @PluginMethod
    fun getPendingAppUrl(call: PluginCall) {
        val result = JSObject()
        pendingAppUrl?.let { result.put("url", it) }
        call.resolve(result)
    }

    @PluginMethod
    fun clearPendingAppUrl(call: PluginCall) {
        pendingAppUrl = null
        activity.intent?.data = null
        call.resolve()
    }

    private fun captureAppUrl(intent: Intent?, notify: Boolean) {
        val url = intent?.dataString ?: return
        pendingAppUrl = url
        if (notify) {
            notifyListeners("appUrlOpen", JSObject().put("url", url))
        }
    }
}
