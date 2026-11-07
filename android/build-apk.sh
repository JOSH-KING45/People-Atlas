#!/usr/bin/env bash
set -euo pipefail

: "${ANDROID_BUILD_TOOLS:?Set ANDROID_BUILD_TOOLS to the build-tools directory}"
: "${ANDROID_PLATFORM_JAR:?Set ANDROID_PLATFORM_JAR to the SDK android.jar}"
: "${ATLAS_SIGNING_KEYSTORE:?Set ATLAS_SIGNING_KEYSTORE to the APK signing keystore}"
: "${ATLAS_SIGNING_PASSWORD:?Set ATLAS_SIGNING_PASSWORD in the environment}"
: "${ATLAS_SIGNING_ALIAS:?Set ATLAS_SIGNING_ALIAS to the key alias}"

cd "$(dirname "$0")"
output=$(realpath -m "${1:-build/People-Atlas-v1.0.0-test.apk}")
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work"/{classes,dex,gen} "$(dirname "$output")"
maven=https://dl.google.com/dl/android/maven2/androidx

dependency() {
    local name=$1 artifact=$2 checksum=$3
    curl --retry 2 --max-time 60 -fsS "$maven/$artifact" -o "$work/$name.aar"
    printf '%s  %s\n' "$checksum" "$work/$name.aar" | sha256sum --check --status
    unzip -q "$work/$name.aar" -d "$work/$name"
    "$ANDROID_BUILD_TOOLS/aapt2" compile --dir "$work/$name/res" -o "$work/$name.zip"
}

dependency browser browser/browser/1.8.0/browser-1.8.0.aar 2d6167b33bf6a064c37501501543702349e850ac62c732d1efa4e71063675456
dependency core core/core/1.13.1/core-1.13.1.aar 2c27de199535675005553066597a4b20fa1eea7c228ab4ef6b32b5fe39ca1f59

tools=$ANDROID_BUILD_TOOLS
"$tools/aapt2" compile --dir res -o "$work/app.zip"
"$tools/aapt2" link -I "$ANDROID_PLATFORM_JAR" --manifest AndroidManifest.xml \
    -A assets --java "$work/gen" --extra-packages androidx.browser:androidx.core --auto-add-overlay \
    -R "$work/core.zip" -R "$work/browser.zip" -R "$work/app.zip" -o "$work/base.apk"

compiler=(javac)
if [[ -n "${ECJ_JAR:-}" ]]; then compiler=(java -jar "$ECJ_JAR" -proc:none); fi
mapfile -t sources < <(find src "$work/gen" -name '*.java' | sort)
"${compiler[@]}" -source 8 -target 8 -bootclasspath "$ANDROID_PLATFORM_JAR:$tools/core-lambda-stubs.jar" \
    -classpath "$work/browser/classes.jar:$work/core/classes.jar" -d "$work/classes" "${sources[@]}"
(cd "$work/classes" && zip -q -r "$work/app.jar" .)

printf '%s\n' '-keep class ng.com.mypeople.atlas.MainActivity { *; }' '-dontwarn androidx.annotation.**' > "$work/keep.pro"
java -cp "$tools/lib/d8.jar" com.android.tools.r8.R8 --release --pg-conf "$work/keep.pro" --min-api 23 --lib "$ANDROID_PLATFORM_JAR" --output "$work/dex" \
    "$work/app.jar" "$work/browser/classes.jar" "$work/core/classes.jar"
(cd "$work/dex" && zip -q -j "$work/base.apk" ./*.dex)
"$tools/zipalign" -f 4 "$work/base.apk" "$work/aligned.apk"
"$tools/apksigner" sign --ks "$ATLAS_SIGNING_KEYSTORE" --ks-key-alias "$ATLAS_SIGNING_ALIAS" \
    --ks-pass env:ATLAS_SIGNING_PASSWORD --out "$output" "$work/aligned.apk"
"$tools/apksigner" verify --verbose --print-certs "$output"
