package ng.com.mypeople.atlas;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import java.util.Collections;

public final class MainActivity extends Activity {
    private static final Uri SITE = Uri.parse("https://mypeople.com.ng/");
    private static final String SETTINGS = "ng.com.mypeople.atlas.test.APP_LOCK";
    private static final String LOCK_ENABLED = "app_lock_enabled";
    private CancellationSignal authentication;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean launched;
    private boolean bound;

    private final CustomTabsServiceConnection connection = new CustomTabsServiceConnection() {
        @Override
        public void onCustomTabsServiceConnected(ComponentName name, CustomTabsClient client) {
            if (launched || isFinishing()) return;
            client.warmup(0);
            CustomTabsSession session = client.newSession(null);
            if (session != null) {
                try {
                    new TrustedWebActivityIntentBuilder(SITE).build(session).launchTrustedWebActivity(MainActivity.this);
                    launched = true;
                    finish();
                    return;
                } catch (ActivityNotFoundException ignored) {
                    // Browser support may have changed after the service resolved.
                }
            }
            openBrowser();
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            openBrowser();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        if (SETTINGS.equals(getIntent().getAction())) {
            showLockScreen(true, null);
        } else if (lockEnabled()) {
            showLockScreen(false, null);
            if (savedInstanceState == null) authenticate(false);
        } else {
            launchAtlas();
        }
    }

    private SharedPreferences settings() {
        return getSharedPreferences("atlas_launcher", MODE_PRIVATE);
    }

    private boolean lockEnabled() {
        return settings().getBoolean(LOCK_ENABLED, false);
    }

    private void showLockScreen(boolean configuring, String error) {
        boolean enabled = lockEnabled();
        LinearLayout screen = new LinearLayout(this);
        screen.setOrientation(LinearLayout.VERTICAL);
        screen.setGravity(Gravity.CENTER_VERTICAL);
        int padding = Math.round(24 * getResources().getDisplayMetrics().density);
        screen.setPadding(padding, padding, padding, padding);
        TextView title = new TextView(this);
        title.setText(configuring ? "People Atlas app lock" : "People Atlas is locked");
        title.setTextSize(24);
        screen.addView(title);
        TextView description = new TextView(this);
        description.setText(configuring
            ? "Optional. Require Android authentication when opening Atlas from its app icon. This does not lock an already-open browser tab."
            : "Use your fingerprint, supported biometrics, or your device screen lock to continue.");
        description.setPadding(0, padding / 2, 0, padding / 2);
        screen.addView(description);
        if (error != null) {
            TextView message = new TextView(this);
            message.setText(error);
            message.setAccessibilityLiveRegion(android.view.View.ACCESSIBILITY_LIVE_REGION_POLITE);
            screen.addView(message);
        }
        Button action = new Button(this);
        action.setText(configuring ? (enabled ? "Turn app lock off" : "Turn app lock on") : "Unlock");
        action.setOnClickListener(view -> authenticate(configuring));
        screen.addView(action);
        if (configuring) {
            Button open = new Button(this);
            open.setText("Open People Atlas");
            open.setOnClickListener(view -> {
                if (lockEnabled()) {
                    showLockScreen(false, null);
                    authenticate(false);
                } else launchAtlas();
            });
            screen.addView(open);
        }
        setContentView(screen);
    }

    private void authenticate(boolean configuring) {
        if (authentication != null || launched) return;
        if (Build.VERSION.SDK_INT < 30) {
            showLockScreen(configuring, "This app lock requires Android 11 or later.");
            return;
        }

        int authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG
            | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
        BiometricManager biometrics = getSystemService(BiometricManager.class);
        if (biometrics == null || biometrics.canAuthenticate(authenticators) != BiometricManager.BIOMETRIC_SUCCESS) {
            showLockScreen(configuring, "Set up a fingerprint or screen lock in Android Settings, then try again.");
            return;
        }
        authentication = new CancellationSignal();
        new BiometricPrompt.Builder(this)
            .setTitle(configuring ? "Confirm app lock change" : "Unlock People Atlas")
            .setAllowedAuthenticators(authenticators)
            .build()
            .authenticate(authentication, getMainExecutor(), new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    authentication = null;
                    if (isFinishing() || isDestroyed()) return;
                    if (configuring) {
                        boolean enabled = !lockEnabled();
                        settings().edit().putBoolean(LOCK_ENABLED, enabled).apply();
                        showLockScreen(true, enabled ? "App lock is on." : "App lock is off.");
                    } else launchAtlas();
                }

                @Override
                public void onAuthenticationError(int code, CharSequence message) {
                    authentication = null;
                    if (!isFinishing() && !isDestroyed()) showLockScreen(configuring, message.toString());
                }
            });
    }

    private void launchAtlas() {
        if (launched || isFinishing()) return;
        String browser = CustomTabsClient.getPackageName(this, Collections.emptyList());
        if (browser != null) {
            bound = CustomTabsClient.bindCustomTabsService(this, browser, connection);
        }
        if (bound) handler.postDelayed(this::openBrowser, 3000);
        else openBrowser();
    }

    private void openBrowser() {
        if (launched || isFinishing() || isDestroyed()) return;
        launched = true;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, SITE).addCategory(Intent.CATEGORY_BROWSABLE));
            finish();
        } catch (ActivityNotFoundException error) {
            new AlertDialog.Builder(this)
                .setTitle("People Atlas")
                .setMessage("Install or enable an Android browser to open People Atlas.")
                .setPositiveButton(android.R.string.ok, (dialog, which) -> finish())
                .setOnCancelListener(dialog -> finish())
                .show();
        }
    }

    @Override
    protected void onDestroy() {
        if (authentication != null) authentication.cancel();
        handler.removeCallbacksAndMessages(null);
        if (bound) unbindService(connection);
        super.onDestroy();
    }
}
