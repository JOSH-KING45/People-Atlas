# People Atlas for Android

This test launcher opens https://mypeople.com.ng/ in a Trusted Web Activity when the selected browser supports it and verifies the domain. It falls back to the system browser if it cannot open the activity. The Android app uses the hosted Atlas workspace and browser profile, so cloud features and sign-in require internet access.

## Build the signed APK

Use Android SDK Platform 35, Build Tools 35, a Java 17 JDK, curl, unzip and zip. The build downloads and checksum-verifies the AndroidX Browser and Core libraries. The script also supports the Eclipse Java compiler when `ECJ_JAR` is set.

Set these environment variables before running `android/build-apk.sh`:

| Variable | Value |
| --- | --- |
| `ANDROID_BUILD_TOOLS` | Absolute path to SDK Build Tools |
| `ANDROID_PLATFORM_JAR` | Absolute path to SDK Platform 35's `android.jar` |
| `ATLAS_SIGNING_KEYSTORE` | Absolute path to a private APK signing keystore |
| `ATLAS_SIGNING_ALIAS` | Signing key alias |
| `ATLAS_SIGNING_PASSWORD` | Keystore password, supplied securely |

The optional first argument sets the output APK path. Keep signing keys private. The test application ID is `ng.com.mypeople.atlas.test`. Upgrades to that package require the same signing key and a higher version code.

Before releasing an APK signed with a new certificate, add that certificate's SHA-256 fingerprint and the exact application ID to the site's `public/.well-known/assetlinks.json`. Test launch, Google sign-in, guest storage, uploads, and voice capture on an Android device.

## Optional launcher lock

On Android 11 or later, long-press the People Atlas icon, select **App lock**, and choose **Turn app lock on**. Android handles authentication using an enrolled strong biometric or the device screen lock. The setting is off by default and has no idle timer. When enabled it gates launches through the People Atlas icon. Turning it off also requires authentication. Open browser tabs and direct website visits are outside the launcher lock.
