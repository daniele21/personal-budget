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
CI_UI_REMOTE_VIDEO="/data/local/tmp/android-harnex-two-apk.mp4"
CI_UI_RUNTIME_LOG="artifacts/android-ci/harnex-ui-runtime-health.log"
CI_UI_SCREENRECORD_LOG="artifacts/android-ci/harnex-focused-screenrecord.log"
ci_ui_recorder_pid=""
ci_ui_monitor_pid=""

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

start_ci_ui_runtime_monitor() {
  if [[ "${CI:-}" != "true" ]]; then
    return
  fi

  mkdir -p artifacts/android-ci
  : > "$CI_UI_RUNTIME_LOG"
  (
    set +e
    while true; do
      timestamp="$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
      adb_state="$(timeout 2s adb get-state 2>&1 || true)"
      emulator_state="unknown"
      emulator_rss_kb="unknown"
      mem_available_kb="$(awk '/^MemAvailable:/ { print $2 }' /proc/meminfo 2>/dev/null || true)"
      if [[ -s /tmp/aura-android-emulator.pid ]]; then
        emulator_pid="$(cat /tmp/aura-android-emulator.pid)"
        if kill -0 "$emulator_pid" 2>/dev/null; then
          emulator_state="alive"
          emulator_rss_kb="$(ps -o rss= -p "$emulator_pid" 2>/dev/null | tr -d ' ' || true)"
        else
          emulator_state="exited"
        fi
      fi
      printf '%s adb_state=%q emulator_state=%s emulator_rss_kb=%s mem_available_kb=%s\n' \
        "$timestamp" "$adb_state" "$emulator_state" "${emulator_rss_kb:-unknown}" "${mem_available_kb:-unknown}" \
        >> "$CI_UI_RUNTIME_LOG"
      if [[ "$emulator_state" == "exited" ]]; then
        break
      fi
      sleep 2
    done
  ) &
  ci_ui_monitor_pid=$!
}

stop_ci_ui_runtime_monitor() {
  if [[ -z "$ci_ui_monitor_pid" ]]; then
    return
  fi
  kill "$ci_ui_monitor_pid" >/dev/null 2>&1 || true
  wait "$ci_ui_monitor_pid" >/dev/null 2>&1 || true
  ci_ui_monitor_pid=""
}

collect_ci_failure_diagnostics() {
  if [[ "${CI:-}" != "true" ]]; then
    return
  fi

  mkdir -p artifacts/android-ci
  cp /tmp/aura-harnex-import-screenrecord.log "$CI_UI_SCREENRECORD_LOG" 2>/dev/null || true
  cp /tmp/android-runner/emu-crash-*.db artifacts/android-ci/ 2>/dev/null || true
  cat /proc/meminfo > artifacts/android-ci/host-meminfo.txt 2>/dev/null || true
  ps -eo pid,ppid,stat,rss,vsz,etimes,comm,args --sort=-rss \
    > artifacts/android-ci/host-processes.txt 2>/dev/null || true
  timeout 5s dmesg > artifacts/android-ci/host-dmesg.txt 2>&1 || true
  timeout 5s journalctl -k -n 400 --no-pager \
    > artifacts/android-ci/host-kernel-journal.txt 2>&1 || true
}

start_ci_ui_media() {
  if [[ "${CI:-}" != "true" ]]; then
    return
  fi

  # The workflow starts one broad recorder around this script. The material UI
  # evidence is only the packaged import flow below; the preceding Binder tests
  # are assertion-only. Stop the broad recorder and restart a bounded recorder
  # at lower encoder load so long Harnex runs do not destabilize the emulator.
  adb shell pkill -INT screenrecord >/dev/null 2>&1 || true
  sleep 1
  adb shell rm -f "$CI_UI_REMOTE_VIDEO" || true
  adb shell screenrecord \
    --size 720x1600 \
    --bit-rate 4000000 \
    --time-limit 120 \
    "$CI_UI_REMOTE_VIDEO" \
    >/tmp/aura-harnex-import-screenrecord.log 2>&1 &
  ci_ui_recorder_pid=$!
  sleep 1
  if ! kill -0 "$ci_ui_recorder_pid" 2>/dev/null; then
    cat /tmp/aura-harnex-import-screenrecord.log >&2 || true
    echo "Focused Harnex import media recorder failed to start." >&2
    return 1
  fi
  printf 'AURA_HARNEX_TWO_APK media_capture=focused size=720x1600 bit_rate=4000000\n'
}

stop_ci_ui_media() {
  if [[ "${CI:-}" != "true" || -z "$ci_ui_recorder_pid" ]]; then
    return
  fi

  local recorder_status=0
  adb shell pkill -INT screenrecord >/dev/null 2>&1 || true
  wait "$ci_ui_recorder_pid" || recorder_status=$?
  ci_ui_recorder_pid=""
  cp /tmp/aura-harnex-import-screenrecord.log "$CI_UI_SCREENRECORD_LOG" 2>/dev/null || true
  printf 'AURA_HARNEX_TWO_APK media_recorder_exit status=%s\n' "$recorder_status"
  if ! adb shell test -s "$CI_UI_REMOTE_VIDEO"; then
    cat /tmp/aura-harnex-import-screenrecord.log >&2 || true
    echo "Focused Harnex import media evidence is missing." >&2
    return 1
  fi
  printf 'AURA_HARNEX_TWO_APK media_capture=focused_complete\n'
}

cleanup_host() {
  stop_ci_ui_runtime_monitor
  if [[ -n "$ci_ui_recorder_pid" ]]; then
    adb shell pkill -INT screenrecord >/dev/null 2>&1 || true
    wait "$ci_ui_recorder_pid" >/dev/null 2>&1 || true
  fi
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
start_ci_ui_runtime_monitor
if ! start_ci_ui_media; then
  collect_ci_failure_diagnostics
  exit 1
fi
ui_started_ms="$(date +%s%3N)"
set +e
node scripts/verify-harnex-import-webview.mjs
ui_status=$?
set -e
ui_finished_ms="$(date +%s%3N)"
printf 'AURA_HARNEX_TWO_APK ui_process_exit status=%s elapsed_ms=%s\n' \
  "$ui_status" "$((ui_finished_ms - ui_started_ms))"
if [[ "$ui_status" -ne 0 ]]; then
  collect_ci_failure_diagnostics
  exit "$ui_status"
fi
if ! stop_ci_ui_media; then
  collect_ci_failure_diagnostics
  exit 1
fi
stop_ci_ui_runtime_monitor
record_runtime_health post_packaged_import_ui

printf 'AURA_HARNEX_TWO_APK result=PASS\n'
