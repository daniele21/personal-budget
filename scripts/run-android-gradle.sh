#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

java_home_is_21() {
  local candidate="$1"
  [[ -x "${candidate}/bin/java" ]] &&
    "${candidate}/bin/java" -version 2>&1 |
      head -n 1 |
      grep -Eq 'version "(1\.)?21([."-])'
}

resolve_java_home() {
  local candidate

  if [[ -n "${JAVA_HOME:-}" ]] && java_home_is_21 "${JAVA_HOME}"; then
    printf '%s\n' "${JAVA_HOME}"
    return
  fi

  for candidate in \
    "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
    "/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"; do
    if java_home_is_21 "${candidate}"; then
      printf '%s\n' "${candidate}"
      return
    fi
  done

  if [[ -x "/usr/libexec/java_home" ]]; then
    candidate="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"
    if [[ -n "${candidate}" ]] && java_home_is_21 "${candidate}"; then
      printf '%s\n' "${candidate}"
      return
    fi
  fi

  return 1
}

resolve_android_sdk() {
  local candidate

  for candidate in \
    "${ANDROID_HOME:-}" \
    "${ANDROID_SDK_ROOT:-}" \
    "/opt/homebrew/share/android-commandlinetools" \
    "/usr/local/share/android-commandlinetools"; do
    if [[ -n "${candidate}" && -d "${candidate}/platforms" ]]; then
      printf '%s\n' "${candidate}"
      return
    fi
  done

  return 1
}

if ! RESOLVED_JAVA_HOME="$(resolve_java_home)"; then
  echo "Aura Android requires JDK 21. Set JAVA_HOME to a JDK 21 installation." >&2
  exit 1
fi

if ! RESOLVED_ANDROID_SDK="$(resolve_android_sdk)"; then
  echo "Aura Android SDK not found. Set ANDROID_HOME or ANDROID_SDK_ROOT." >&2
  exit 1
fi

export JAVA_HOME="${RESOLVED_JAVA_HOME}"
export ANDROID_HOME="${RESOLVED_ANDROID_SDK}"
export ANDROID_SDK_ROOT="${RESOLVED_ANDROID_SDK}"
export PATH="${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/emulator:${PATH}"

cd "${PROJECT_DIR}/android"
exec ./gradlew "$@"
