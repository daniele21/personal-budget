# Current state

Aura Finance is an active Android-first personal-finance product in controlled release preparation.

## Integrated today

- React/TypeScript local-first ledger, budgeting, recurring, reporting, search and savings workflows.
- Deterministic CSV/XLSX import plus portable archive/export flows.
- Optional client-side encrypted Firebase backup and authenticated allowlist boundary.
- Capacitor Android shell with native payment-candidate review infrastructure and Android test/runbook tooling.
- Vitest/unit regression and bounded Playwright browser E2E.
- Repository-owned Android API 36 remote preflight using isolated debug Firebase/OAuth configuration: clean debug sync/build, Android unit/Lint, packaged APK, booted emulator, 34 native instrumentation tests, process-restart/persistence/deep-link WebView verification, diagnostics, screenshots and video evidence.
- `debug-test/**` is the repository-owned remote debug-test channel, allowing an exact source SHA to be exercised without a developer workstation.
- `repo-template-sw` v0.8.0 adoption with `typescript + android + product-ui` profiles and L2 as the target engineering level.

## Material gaps before a reference-grade L2/release claim

- Physical-device/OEM/TalkBack/text-scaling/real payment-source evidence remains separate real-environment evidence where required.
- Google Play publication automation is repository-owned, but production signing/Play Developer API credentials and an actual controlled-track publication must provide executable evidence before release automation is considered proven end to end.
- Build identity, immutable release artifact promotion, manifest/checksum, comparable-build delta and bounded retention remain evidence requirements for each release; the release workflow provides the identity/checksum path but a real release run is still required.
- Privacy-owner, rollout and rollback release gates remain authoritative.

## Current engineering direction

Use `.engineering/commands.json` as the canonical operation router, `.engineering/e2e.json` for environment fidelity, `design/` for product-experience semantics, and native npm/Playwright/Gradle/Capacitor tooling underneath. The API 36 emulator is now an automated preflight environment; final physical-device validation should confirm only the residual fidelity gaps that cannot be represented safely in CI.
