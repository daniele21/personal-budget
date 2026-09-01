# Contributing to Aura Finance

Aura Finance uses the engineering semantics of `daniele21/repo-template-sw` v0.8.0 while retaining native npm, Playwright, Capacitor and Gradle tooling.

## Setup

Prerequisites are maintained in `README.md`. For a clean JavaScript install use:

```bash
npm ci
```

Copy `.env.example` only when the workflow you are exercising needs local configuration. Android debug builds require the isolated `VITE_ANDROID_FIREBASE_*` configuration documented there. Never commit environment files, OAuth/Firebase configuration files, keystores or signing secrets.

## Before changing code

Read `AGENTS.md`, `.engineering/commands.json`, and the closest owning docs/code. Read `.engineering/e2e.json` for full-workflow/platform claims. For meaningful UI changes, also read `design/ux-contract.json`, `design/brand-kit.json`, and the canonical brand guidance under `brand-kit/`.

Prefer one canonical owner for policy and contracts. Preserve local-first data semantics, explicit user review for imported/detected transactions, optional encrypted backup, and the web/native adapter boundary.

## Validation

Use the narrowest sufficient gates during iteration. Repository-level commands include:

```bash
npm run check
npm run test
npm run build
npm run test:e2e
```

Android-sensitive changes may additionally require native unit tests, Android Lint, instrumentation, WebView smoke, release-readiness/R8 or packaging according to blast radius. Missing local Android tooling is a remote-automation requirement, not a reason to delegate deterministic tests to a human.

Before publication, select the validation profile with `scripts/select_validation_profile.py`, review the complete diff/base freshness, update affected durable documentation, and classify any remaining real-environment evidence explicitly.

## Pull requests

PRs should state the user/system outcome, affected owners, selected validation profile, exact checks executed, E2E environment/fidelity where applicable, documentation impact, and any residual physical-device/signing/accessibility evidence. Do not describe a synthetic/browser/emulator result as stronger evidence than it is.

## Documentation

Use `docs/README.md` for ownership. Preserve valid README mission/positioning when only implementation changes; update README usage whenever prerequisites/setup/run/configuration/examples change. Durable ADRs remain in `/adr`. Temporary completed workstream plans are deleted by default after their durable knowledge has moved to canonical owners.
