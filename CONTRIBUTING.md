# Contributing to Aura Finance

Aura Finance uses the engineering semantics of `daniele21/repo-template-sw` **0.9.2** while retaining native npm, Playwright, Capacitor and Gradle tooling.

## Setup

Prerequisites are maintained in `README.md`. For a clean JavaScript install use:

```bash
npm ci
```

Copy `.env.example` only when the workflow you are exercising needs local configuration. Android debug builds require the isolated `VITE_ANDROID_FIREBASE_*` configuration documented there. Never commit environment files, OAuth/Firebase configuration files, keystores or signing secrets.

## Before changing code

Read `AGENTS.md`, `.engineering/commands.json`, and the closest owning docs/code. Read `.engineering/e2e.json` for full-workflow/platform claims. For meaningful UI changes, also read `design/ux-contract.json`, `design/brand-kit.json`, and the canonical brand guidance under `brand-kit/`.

Prefer one canonical owner for policy and contracts. Preserve local-first data semantics, explicit user review for imported/detected transactions, optional encrypted backup, and the web/native adapter boundary.

## Delivery stages

- `ITERATION`: use the cheapest focused checks while the implementation is still changing.
- `INTEGRATION`: feature PRs target `dev`. Exact-head automated risk gates and affected E2E are required; material UI/UX journeys use screenshots + continuous video. Required real-device evidence is recorded but deferred.
- `RELEASE`: `dev -> main`. FULL validation and every applicable required physical/target-environment confirmation are blocking.

Do not run physical/OEM/TalkBack/real payment-source evidence merely to merge an ordinary feature into `dev`. Those runs remain valid earlier when diagnosing a hardware-specific problem.

## Validation

Repository-level commands include:

```bash
npm run check
npm run test
npm run build
npm run test:e2e:preflight
```

Android-sensitive changes may additionally require native unit tests, Android Lint, instrumentation and packaged WebView verification according to risk. Missing local Android tooling is a remote-automation requirement, not a reason to delegate deterministic tests to a human.

Before integration or release, run the stage-aware selector, review complete diff/base freshness, update affected durable documentation and classify residual environment evidence explicitly.

## Pull requests

Feature PRs should normally target `dev`. State the user/system outcome, affected owners, delivery stage, selected profile, required gates, exact checks executed, E2E environment/fidelity, documentation impact and residual real-environment evidence. Do not describe a synthetic/browser/emulator result as stronger evidence than it is.

A promotion PR from `dev` to `main` is a release boundary and must not claim `RELEASE_READY` while an applicable required real-environment gate remains unresolved.

## Documentation

Use `docs/README.md` for ownership. Preserve valid README mission/positioning when only implementation changes; update README usage whenever prerequisites/setup/run/configuration/examples change. Durable ADRs remain in `/adr`. Temporary completed workstream plans are deleted by default after their durable knowledge has moved to canonical owners.
