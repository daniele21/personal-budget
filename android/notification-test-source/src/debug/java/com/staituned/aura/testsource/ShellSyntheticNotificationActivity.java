package com.staituned.aura.testsource;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 * Host-only debug entrypoint for recovery verification.
 *
 * The notification test source module has no non-debug variants, so this
 * component can never be packaged into an Aura release artifact. It exists
 * only to let adb start the external synthetic source without starting Aura.
 * The actual notification publisher remains the signature-protected
 * SyntheticNotificationActivity.
 */
public final class ShellSyntheticNotificationActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startActivity(new Intent(this, SyntheticNotificationActivity.class));
        finish();
    }
}
