package com.example.expenseledger.spike;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

// Run 15 (2026-10-29): the phone's Back button used to close the whole app at once (found on an emulator: Back finished the
// activity, so the web app never saw it and could not close its add form or sheets). Now Back is handed to the page:
// window.__ledgerNativeBack() (App.jsx) closes what is open, leaves a tab, or warns "press Back again", and answers "exit"
// only for a second press within 2 seconds on Home. Only then does this activity finish. If the page does not answer (not
// loaded yet, error), Back closes the app as Android normally would.
public class MainActivity extends BridgeActivity {
    // Run 16: the app is dark, so the status and navigation bar icons must be light. Capacitor switches themes while it starts, so
    // this runs again when the screen is shown.
    private void lightIconsOnDarkBars() {
        androidx.core.view.WindowInsetsControllerCompat bars = androidx.core.view.WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.setAppearanceLightStatusBars(false);
        bars.setAppearanceLightNavigationBars(false);
    }

    @Override
    public void onResume() {
        super.onResume();
        lightIconsOnDarkBars();
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        lightIconsOnDarkBars();
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                final WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView == null) { finish(); return; }
                webView.evaluateJavascript(
                    "(function(){try{return window.__ledgerNativeBack?window.__ledgerNativeBack():'exit';}catch(e){return 'exit';}})()",
                    value -> { if (value == null || value.contains("exit")) { finish(); } });
            }
        });
    }
}
