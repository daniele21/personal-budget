package com.staituned.aura;

import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

import java.net.URI;
import java.net.URISyntaxException;

/**
 * Keeps the Capacitor bridge attached only to Aura's bundled local origin.
 * Remote top-level and frame navigation is blocked instead of being loaded
 * inside the privileged WebView.
 */
public final class AuraBridgeWebViewClient extends BridgeWebViewClient {

    public AuraBridgeWebViewClient(Bridge bridge) {
        super(bridge);
    }

    @Override
    public boolean shouldOverrideUrlLoading(
        WebView view,
        WebResourceRequest request
    ) {
        return !isApprovedAppUrl(request.getUrl().toString());
    }

    static boolean isApprovedAppUrl(String value) {
        try {
            URI uri = new URI(value);
            return "https".equals(uri.getScheme())
                && "localhost".equals(uri.getHost())
                && uri.getPort() == -1
                && uri.getUserInfo() == null;
        } catch (URISyntaxException exception) {
            return false;
        }
    }
}
