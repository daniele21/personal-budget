# Current state

Aura Finance is an active Android-first personal-finance product in controlled release preparation.

## Integrated today

- React/TypeScript local-first ledger, budgeting, recurring, reporting, search and savings workflows.
- Deterministic CSV/XLSX import plus portable archive/export flows.
- Optional client-side encrypted Firebase backup and authenticated allowlist boundary.
- Capacitor Android shell with native payment-candidate review infrastructure and Android test/runbook tooling.
- Vitest/unit regression and bounded Playwright critical-journey E2E.
- Repository-owned Android API 36 remote preflight using isolated debug Firebase/OAuth configuration: clean debug sync/build, Android unit/Lint, packaged APK, booted emulator, native instrumentation, process-restart/persistence/deep-link WebView verification, diagnostics, screenshots and continuous video evidence.
- Browser critical journeys can retain success screenshots/video when selected as material UI/UX integration evidence.
- `debug-test/**` remains a repository-owned diagnostic channel for exact source revisions without a developer workstation.
- `repo-template-sw` **0.9.2** is the engineering baseline with `typescript + android + product-ui` profiles and L2 as the target engineering level.
- `dev` is the shared integration branch; `main` is the stable/release branch.

## Delivery semantics

- Feature/PR -> `dev`: affected automated validation, browser E2E and Android emulator/package evidence are blocking when selected. Material UI/UX journeys use `FULL_MEDIA`.
- Physical-device/OEM/TalkBack/text-scaling/approved real payment-source evidence is explicit but non-blocking for entry into `dev`; required gaps are `DEFERRED_TO_RELEASE`.
- `dev` -> `main`: FULL release validation plus every applicable required real/target-environment confirmation.

## Material gaps before a reference-grade L2/release claim

- Physical-device/OEM/TalkBack/text-scaling/real payment-source evidence remains separate `REAL_ENVIRONMENT` evidence where required.
- Google Play publication automation is repository-owned, but production signing/Play Developer API credentials and an actual controlled-track publication must provide executable evidence before release automation is considered proven end to end.
- Build identity, immutable release artifact promotion, manifest/checksum, comparable-build delta and bounded retention remain evidence requirements for each release; the release workflow provides the identity/checksum path but a real release run is still required.
- Privacy-owner, rollout and rollback release gates remain authoritative.

## Current engineering direction

Use `.engineering/commands.json` as the operation/stage router, `.engineering/e2e.json` for environment fidelity and journey evidence, `design/` for product-experience semantics, and native npm/Playwright/Gradle/Capacitor tooling underneath. Automatic integration should discover defects before `dev`; final physical-device validation should confirm only residual target-environment gaps before `main`/release.
