package com.staituned.aura.paymentdetection.data

import android.content.Context
import android.content.pm.PackageManager

internal data class SupportedPaymentApp(
    val id: String,
    val packageName: String,
    val displayName: String,
    val syntheticOnly: Boolean,
)

/**
 * M4 starts with controlled instrumentation sources only. Real payment app
 * package names must not be guessed or added before the product/privacy gate.
 */
internal object SupportedPaymentAppCatalog {
    private val apps = listOf(
        SupportedPaymentApp(
            id = "aura-synthetic-source",
            packageName = "com.staituned.aura.syntheticnotifications",
            displayName = "Aura controlled test source",
            syntheticOnly = true,
        ),
    )

    fun findByPackageName(packageName: String): SupportedPaymentApp? =
        apps.firstOrNull { it.packageName == packageName }

    fun installedApps(context: Context): List<SupportedPaymentApp> =
        apps.filter { isInstalled(context, it.packageName) }

    fun packageNames(): Set<String> = apps.mapTo(mutableSetOf()) { it.packageName }

    private fun isInstalled(context: Context, packageName: String): Boolean =
        try {
            context.packageManager.getPackageInfo(
                packageName,
                PackageManager.PackageInfoFlags.of(0),
            )
            true
        } catch (_: PackageManager.NameNotFoundException) {
            false
        }
}
