package com.staituned.aura;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.security.NetworkSecurityPolicy;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class AuraRuntimeInstrumentedTest {

    @Test
    public void debugBuildUsesIsolatedPackageAndDisablesAndroidBackup() throws Exception {
        Context appContext =
            InstrumentationRegistry.getInstrumentation().getTargetContext();

        assertEquals("com.staituned.aura.debug", appContext.getPackageName());
        ApplicationInfo applicationInfo = appContext.getPackageManager()
            .getApplicationInfo(appContext.getPackageName(), 0);
        assertFalse(
            "Android Auto Backup must remain disabled.",
            (applicationInfo.flags & ApplicationInfo.FLAG_ALLOW_BACKUP) != 0
        );
    }

    @Test
    public void allowlistedDebugDeepLinkResolvesOnlyInsideAura() {
        Context appContext =
            InstrumentationRegistry.getInstrumentation().getTargetContext();
        Intent intent = new Intent(
            Intent.ACTION_VIEW,
            Uri.parse("com.staituned.aura.debug://open/data")
        );
        intent.setPackage(appContext.getPackageName());

        ResolveInfo resolved = appContext.getPackageManager().resolveActivity(intent, 0);

        assertNotNull("Aura debug deep link must resolve.", resolved);
        assertEquals(
            MainActivity.class.getName(),
            resolved.activityInfo.name
        );
        assertEquals(
            appContext.getPackageName(),
            resolved.activityInfo.packageName
        );
    }

    @Test
    public void runtimeDisablesCleartextAndExportsNoBackgroundComponents()
        throws Exception {
        Context appContext =
            InstrumentationRegistry.getInstrumentation().getTargetContext();

        assertFalse(
            "Cleartext traffic must remain disabled.",
            NetworkSecurityPolicy.getInstance().isCleartextTrafficPermitted()
        );

        PackageInfo packageInfo = appContext.getPackageManager().getPackageInfo(
            appContext.getPackageName(),
            android.content.pm.PackageManager.PackageInfoFlags.of(
                android.content.pm.PackageManager.GET_SERVICES
                    | android.content.pm.PackageManager.GET_RECEIVERS
                    | android.content.pm.PackageManager.GET_PROVIDERS
            )
        );

        assertNotNull(packageInfo.services);
        android.content.pm.ServiceInfo[] auraServices =
            java.util.Arrays.stream(packageInfo.services)
                .filter(service -> service.name.startsWith("com.staituned.aura."))
                .toArray(android.content.pm.ServiceInfo[]::new);
        assertEquals(
            "Only the M4 notification listener may be Aura-owned.",
            1,
            auraServices.length
        );
        assertTrue(
            auraServices[0].name.endsWith("AuraNotificationListenerService")
        );
        assertFalse(
            "The system-bound listener must not be exported.",
            auraServices[0].exported
        );
        assertEquals(
            "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
            auraServices[0].permission
        );
        assertFalse(
            "M3 must not introduce an exported Aura-owned receiver.",
            packageInfo.receivers != null
                && java.util.Arrays.stream(packageInfo.receivers)
                    .anyMatch(receiver ->
                        receiver.name.startsWith("com.staituned.aura.")
                            && receiver.exported
                    )
        );
        assertFalse(
            "The Aura FileProvider must remain non-exported.",
            packageInfo.providers != null
                && java.util.Arrays.stream(packageInfo.providers)
                    .anyMatch(provider ->
                        provider.name.contains("FileProvider")
                            && provider.exported
                    )
        );
    }
}
