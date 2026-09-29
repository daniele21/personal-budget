package com.staituned.aura;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.staituned.aura.paymentdetection.service.CandidateCleanupScheduler;
import com.staituned.aura.paymentdetection.service.PaymentListenerRecoveryScheduler;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeGoogleAuthPlugin.class);
        registerPlugin(NativeAppRuntimePlugin.class);
        registerPlugin(NativeLocalNotificationsPlugin.class);
        registerPlugin(PaymentDetectionPrivacyPlugin.class);
        super.onCreate(savedInstanceState);
        bridge.setWebViewClient(new AuraBridgeWebViewClient(bridge));
        CandidateCleanupScheduler.schedule(this);
        CandidateCleanupScheduler.runSoon(this);
        PaymentListenerRecoveryScheduler.schedule(this);
        PaymentListenerRecoveryScheduler.runSoon(this);
    }

    @Override
    public void onResume() {
        super.onResume();
        CandidateCleanupScheduler.runSoon(this);
        PaymentListenerRecoveryScheduler.runSoon(this);
    }
}
