package com.staituned.aura.testsource;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Bundle;

/**
 * Controlled, static and synthetic M4 fixture. This APK is test tooling and
 * must never be included in an Aura distribution artifact.
 */
public final class SyntheticNotificationActivity extends Activity {
    private static final String CHANNEL_ID = "aura-synthetic-payment-source";
    private static final int NOTIFICATION_ID = 43001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(
            new NotificationChannel(
                CHANNEL_ID,
                "Synthetic payment source",
                NotificationManager.IMPORTANCE_DEFAULT
            )
        );
        manager.notify(
            NOTIFICATION_ID,
            new Notification.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Synthetic payment")
                .setContentText("EUR 12.34 at Synthetic Merchant")
                .build()
        );
        finish();
    }
}
