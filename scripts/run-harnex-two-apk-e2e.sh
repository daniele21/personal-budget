#!/usr/bin/env bash
set -euo pipefail

HOST_APK="${1:-}"
AURA_APK="${2:-android/app/build/outputs/apk/debug/app-debug.apk}"
AURA_TEST_APK="${3:-android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk}"

HOST_PACKAGE="io.github.daniele21.localllm.phonetest.debug"
AURA_PACKAGE="com.staituned.aura.debug"
AURA_TEST_PACKAGE="com.staituned.aura.debug.test"
RUNNER="androidx.test.runner.AndroidJUnitRunner"
TEST_CLASS="com.staituned.aura.harnex.AuraHarnexTwoApkInstrumentedTest"

if [[ -n "${AURA_HARNEX_EVIDENCE_FILE:-}" ]]; then
  mkdir -p "$(dirname "$AURA_HARNEX_EVIDENCE_FILE")"
  exec > >(tee "$AURA_HARNEX_EVIDENCE_FILE") 2>&1
fi

if [[ -z "$HOST_APK" || ! -f "$HOST_APK" ]]; then
  echo "Usage: $0 <harnex-emulator-e2e.apk> [aura-debug.apk] [aura-debug-androidTest.apk]" >&2
  exit 2
fi
for artifact in "$AURA_APK" "$AURA_TEST_APK"; do
  if [[ ! -f "$artifact" ]]; then
    echo "Missing packaged Aura test artifact: $artifact" >&2
    exit 2
  fi
done
if ! command -v adb >/dev/null 2>&1; then
  echo "adb is required for two-APK evidence." >&2
  exit 2
fi

run_test() {
  local method="$1"
  adb shell am instrument -w -r \
    -e class "${TEST_CLASS}#${method}" \
    "${AURA_TEST_PACKAGE}/${RUNNER}"
}

cleanup_host() {
  adb uninstall "$HOST_PACKAGE" >/dev/null 2>&1 || true
}
trap cleanup_host EXIT

# Guarantee the contract's consumer-before-host install order and a clean Host control-plane store.
adb uninstall "$HOST_PACKAGE" >/dev/null 2>&1 || true
adb uninstall "$AURA_TEST_PACKAGE" >/dev/null 2>&1 || true
adb uninstall "$AURA_PACKAGE" >/dev/null 2>&1 || true
adb install "$AURA_APK" >/dev/null
adb install "$AURA_TEST_APK" >/dev/null

printf 'AURA_HARNEX_TWO_APK scenario=host_absent aura_package=%s host_package=%s\n' "$AURA_PACKAGE" "$HOST_PACKAGE"
run_test hostAbsentFailsClosed

# Harnex now observes Aura's exact independently signed package/signer and must seed it PENDING.
adb install "$HOST_APK" >/dev/null
adb shell am start -W -n \
  "$HOST_PACKAGE/io.github.daniele21.localllm.phonetest.MainActivity" >/dev/null

printf 'AURA_HARNEX_TWO_APK scenario=packaged_lifecycle aura_package=%s host_package=%s\n' "$AURA_PACKAGE" "$HOST_PACKAGE"
run_test packagedAuraExercisesAuthorizedHarnexLifecycle

# Keep the authorized Host alive and prove the packaged WebView crosses the real Capacitor/Consumer/Binder boundary
# before converging back into Aura's existing Review and verified transaction commit path.
printf 'AURA_HARNEX_TWO_APK scenario=packaged_webview_import aura_package=%s host_package=%s\n' "$AURA_PACKAGE" "$HOST_PACKAGE"
node scripts/verify-android-harnex-import.mjs

printf 'AURA_HARNEX_TWO_APK result=PASS\n'
