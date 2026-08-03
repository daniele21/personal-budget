package com.staituned.aura.paymentdetection.data

import android.content.Context
import android.content.pm.PackageManager

internal data class SupportedPaymentApp(
    val id: String,
    val packageName: String,
    val displayName: String,
    val syntheticOnly: Boolean,
)

internal data class SupportedPaymentAppAvailability(
    val app: SupportedPaymentApp,
    val installed: Boolean,
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
        SupportedPaymentApp(
            id = "intesa-sanpaolo-mobile",
            packageName = "com.latuabancaperandroid",
            displayName = "Intesa Sanpaolo Mobile",
            syntheticOnly = false,
        ),
        SupportedPaymentApp(
            id = "google-wallet",
            packageName = "com.google.android.apps.walletnfcrel",
            displayName = "Google Wallet",
            syntheticOnly = false,
        ),
    )

    fun findByPackageName(packageName: String): SupportedPaymentApp? =
        apps.firstOrNull { it.packageName == packageName }

    fun findById(id: String): SupportedPaymentApp? =
        apps.firstOrNull { it.id == id }

    fun supportedApps(context: Context): List<SupportedPaymentAppAvailability> =
        apps.map { app ->
            SupportedPaymentAppAvailability(
                app = app,
                installed = isInstalled(context, app.packageName),
            )
        }

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
