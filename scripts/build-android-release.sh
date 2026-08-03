#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
KEYCHAIN_SERVICE="com.staituned.aura.android-upload"
KEYCHAIN_ACCOUNT="aura-upload"
DEFAULT_STORE_FILE="${HOME}/.keystore/aura-upload.jks"
DEFAULT_KEY_ALIAS="aura-upload"

usage() {
  cat <<'EOF'
Usage:
  npm run android:signing:setup
  npm run android:bundle:release

The setup command securely prompts once for the upload-keystore password and
stores it in the user's default macOS Keychain. The release command retrieves
it without printing it, rebuilds production web assets, checks release
readiness, and creates the signed Android App Bundle.

Optional non-secret overrides:
  AURA_ANDROID_UPLOAD_STORE_FILE  Upload keystore path
  AURA_ANDROID_UPLOAD_KEY_ALIAS   Upload key alias
EOF
}

require_macos_keychain() {
  if [[ "$(uname -s)" != "Darwin" ]] || ! command -v security >/dev/null 2>&1; then
    echo "This helper requires the macOS Keychain 'security' command." >&2
    exit 1
  fi
}

setup_keychain_password() {
  require_macos_keychain
  echo "Store the Aura upload-keystore password in macOS Keychain."
  echo "Input is handled by Keychain and is not shown or added to shell history."
  security add-generic-password \
    -U \
    -a "${KEYCHAIN_ACCOUNT}" \
    -s "${KEYCHAIN_SERVICE}" \
    -l "Aura Android upload keystore" \
    -j "Password for the Aura Play upload keystore; store and key password are identical." \
    -w
  echo "Aura Android signing password saved in macOS Keychain."
}

read_keychain_password() {
  require_macos_keychain
  security find-generic-password \
    -a "${KEYCHAIN_ACCOUNT}" \
    -s "${KEYCHAIN_SERVICE}" \
    -w 2>/dev/null
}

build_release() {
  local store_file="${AURA_ANDROID_UPLOAD_STORE_FILE:-${DEFAULT_STORE_FILE}}"
  local key_alias="${AURA_ANDROID_UPLOAD_KEY_ALIAS:-${DEFAULT_KEY_ALIAS}}"
  local signing_password

  if [[ ! -f "${store_file}" ]]; then
    echo "Upload keystore not found at ${store_file}." >&2
    echo "Set AURA_ANDROID_UPLOAD_STORE_FILE if it is stored elsewhere." >&2
    exit 1
  fi

  if ! signing_password="$(read_keychain_password)" || [[ -z "${signing_password}" ]]; then
    echo "Aura signing password is not available in macOS Keychain." >&2
    echo "Run: npm run android:signing:setup" >&2
    exit 1
  fi

  trap 'unset signing_password AURA_ANDROID_UPLOAD_STORE_PASSWORD AURA_ANDROID_UPLOAD_KEY_PASSWORD' EXIT

  cd "${PROJECT_DIR}"
  npm run android:sync
  npm run android:verify:release-readiness

  AURA_ANDROID_UPLOAD_STORE_FILE="${store_file}" \
  AURA_ANDROID_UPLOAD_STORE_PASSWORD="${signing_password}" \
  AURA_ANDROID_UPLOAD_KEY_ALIAS="${key_alias}" \
  AURA_ANDROID_UPLOAD_KEY_PASSWORD="${signing_password}" \
    bash scripts/run-android-gradle.sh :app:bundleRelease

  echo
  echo "Signed Android App Bundle created:"
  echo "${PROJECT_DIR}/android/app/build/outputs/bundle/release/app-release.aab"
}

case "${1:-build}" in
  setup)
    setup_keychain_password
    ;;
  build)
    build_release
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
