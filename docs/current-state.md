# Current state

Aura Finance is an active Android-first personal-finance product in controlled release preparation.

## Integrated today

- React/TypeScript local-first ledger, budgeting, recurring, reporting, search and savings workflows.
- Deterministic CSV/XLSX import plus portable archive/export flows.
- Optional client-side encrypted Firebase backup and authenticated allowlist boundary.
- Capacitor Android shell with native payment-candidate review infrastructure and Android test/runbook tooling.
- Vitest/unit regression, Playwright browser E2E, Android unit/Lint/instrumentation/WebView verification paths.
- `repo-template-sw` v0.8.0 adoption with `typescript + android + product-ui` profiles and L2 as the target engineering level.

## Material gaps before a reference-grade L2/release claim

- Android emulator remote preflight is not yet repository-owned because the isolated debug Firebase/OAuth/Google Services fixture must be provisioned safely in CI.
- Physical-device/OEM/TalkBack/text-scaling/payment-source evidence remains separate real-environment evidence where required.
- Build identity, immutable artifact promotion, manifest/checksum, comparable-build delta and bounded retention are contractual requirements; release tooling must provide executable evidence before L2 is claimed.
- Signing/Play Console/rollout/rollback and privacy-owner release gates remain authoritative.

## Current engineering direction

Use `.engineering/commands.json` as the canonical operation router, `.engineering/e2e.json` for environment fidelity, `design/` for product-experience semantics, and native npm/Playwright/Gradle/Capacitor tooling underneath. Prefer strengthening remote automation so final physical-device validation confirms residual fidelity gaps rather than discovering ordinary workflow regressions.
