package ng.com.mypeople.atlas;

import android.app.Activity;
import android.app.AlertDialog;
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
        handler.removeCallbacksAndMessages(null);
        if (bound) unbindService(connection);
        super.onDestroy();
    }
}
