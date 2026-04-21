#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v firebase >/dev/null 2>&1; then
  echo "Firebase CLI not found. Install it with: npm install -g firebase-tools"
  exit 1
fi

PROJECT_ID="${FIREBASE_PROJECT_ID:-}"

if [ -z "$PROJECT_ID" ] && [ -f ".env" ]; then
  PROJECT_ID="$(
    node --input-type=module -e "
      import { config } from 'dotenv';
      config({ path: '.env', quiet: true });
      process.stdout.write((process.env.VITE_FIREBASE_PROJECT_ID || '').trim());
    "
  )"
fi

npm run build

if [ -n "$PROJECT_ID" ]; then
  firebase deploy --only hosting --project "$PROJECT_ID"
else
  firebase deploy --only hosting
fi
