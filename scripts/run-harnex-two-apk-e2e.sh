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
if ! command -v node >/dev/null 2>&1; then
  echo "node is required for the packaged Harnex-assisted WebView journey." >&2
  exit 2
fi

record_runtime_health() {
  local phase="$1"
  local adb_state="unavailable"
  local emulator_state="unknown"
  local emulator_rss_kb="unknown"
  local mem_available_kb="unknown"
  local cgroup_events="unavailable"

  adb_state="$(adb get-state 2>&1 || true)"
  mem_available_kb="$(awk '/^MemAvailable:/ { print $2 }' /proc/meminfo 2>/dev/null || true)"
  if [[ -f /tmp/aura-android-emulator.pid ]]; then
    local emulator_pid
    emulator_pid="$(cat /tmp/aura-android-emulator.pid)"
    if kill -0 "$emulator_pid" 2>/dev/null; then
      emulator_state="alive"
      emulator_rss_kb="$(ps -o rss= -p "$emulator_pid" 2>/dev/null | tr -d ' ' || true)"
    else
      emulator_state="exited"
    fi
  fi
  if [[ -r /sys/fs/cgroup/memory.events ]]; then
    cgroup_events="$(tr '\n' ',' < /sys/fs/cgroup/memory.events)"
  fi

  printf 'AURA_HARNEX_TWO_APK runtime_health phase=%s adb_state=%q emulator_state=%s emulator_rss_kb=%s mem_available_kb=%s cgroup_memory_events=%q\n' \
    "$phase" "$adb_state" "$emulator_state" "${emulator_rss_kb:-unknown}" "${mem_available_kb:-unknown}" "$cgroup_events"
}

release_ci_build_daemons() {
  if [[ "${CI:-}" != "true" ]]; then
    return
  fi

  printf 'AURA_HARNEX_TWO_APK resource_cleanup=android_build_daemons\n'
  bash scripts/run-android-gradle.sh --stop >/dev/null 2>&1 || true
  pkill -f 'kotlin-daemon' >/dev/null 2>&1 || true
}

run_test() {
  local method="$1"
  local output=""
  local adb_status=0

  output="$(adb shell am instrument -w -r \
    -e class "${TEST_CLASS}#${method}" \
    "${AURA_TEST_PACKAGE}/${RUNNER}" 2>&1)" || adb_status=$?
  printf '%s\n' "$output"

  if [[ "$adb_status" -ne 0 ]]; then
    echo "Instrumentation command failed for ${method} with adb status ${adb_status}." >&2
    return 1
  fi
  if grep -Fq 'FAILURES!!!' <<<"$output" || \
    grep -Eq 'INSTRUMENTATION_STATUS_CODE: -[0-9]+' <<<"$output" || \
    ! grep -Fq 'INSTRUMENTATION_STATUS_CODE: 0' <<<"$output" || \
    ! grep -Fq 'OK (1 test)' <<<"$output"; then
    echo "Instrumentation did not report one successful terminal test for ${method}." >&2
    return 1
  fi
}

cleanup_host() {
  adb uninstall "$HOST_PACKAGE" >/dev/null 2>&1 || true
}
trap cleanup_host EXIT

# The workflow no longer needs Gradle/Kotlin compiler daemons once packaged
# instrumentation has completed. Release them before the memory-intensive AVD
# runs Harnex + WebView media capture, while keeping this behavior CI-only.
release_ci_build_daemons
record_runtime_health pre_two_apk

# Guarantee the contract's consumer-before-host install order and a clean Host control-plane store.
adb uninstall "$HOST_PACKAGE" >/dev/null 2>&1 || true
adb uninstall "$AURA_TEST_PACKAGE" >/dev/null 2>&1 || true
adb uninstall "$AURA_PACKAGE" >/dev/null 2>&1 || true
adb install "$AURA_APK" >/dev/null
adb install "$AURA_TEST_APK" >/dev/null

printf 'AURA_HARNEX_TWO_APK scenario=host_absent aura_package=%s host_package=%s\n' "$AURA_PACKAGE" "$HOST_PACKAGE"
run_test hostAbsentFailsClosed
record_runtime_health post_host_absent

# Harnex now observes Aura's exact independently signed package/signer and must seed it PENDING.
adb install "$HOST_APK" >/dev/null
adb shell am start -W -n \
  "$HOST_PACKAGE/io.github.daniele21.localllm.phonetest.MainActivity" >/dev/null

printf 'AURA_HARNEX_TWO_APK scenario=packaged_lifecycle aura_package=%s host_package=%s\n' "$AURA_PACKAGE" "$HOST_PACKAGE"
run_test packagedAuraExercisesAuthorizedHarnexLifecycle
record_runtime_health post_packaged_lifecycle

# The lifecycle test leaves the real Host installed, authorized, assigned and model-ready.
# Exercise the packaged Aura WebView through that exact Binder/control-plane state before cleanup.
printf 'AURA_HARNEX_TWO_APK scenario=packaged_import_ui aura_package=%s host_package=%s\n' "$AURA_PACKAGE" "$HOST_PACKAGE"
node scripts/verify-harnex-import-webview.mjs
record_runtime_health post_packaged_import_ui

printf 'AURA_HARNEX_TWO_APK result=PASS\n'
