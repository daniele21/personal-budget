package com.staituned.aura;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class AuraBridgeWebViewClientTest {

    @Test
    public void allowsOnlyTheBundledCapacitorOrigin() {
        assertTrue(
            AuraBridgeWebViewClient.isApprovedAppUrl(
                "https://localhost/reports"
            )
        );
        assertFalse(
            AuraBridgeWebViewClient.isApprovedAppUrl(
                "https://example.com/reports"
            )
        );
        assertFalse(
            AuraBridgeWebViewClient.isApprovedAppUrl(
                "http://localhost/reports"
            )
        );
        assertFalse(
            AuraBridgeWebViewClient.isApprovedAppUrl(
                "https://user@localhost/reports"
            )
        );
        assertFalse(AuraBridgeWebViewClient.isApprovedAppUrl("not a url"));
    }
}
