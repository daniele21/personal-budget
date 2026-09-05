# Aura Finance agent guide

## Mission and authority

Aura Finance is a private, Android-first personal-finance application. Preserve the product identity and privacy/local-first promises in `README.md`; ordinary engineering truth is owned by this repository, not by remembered template state.

For meaningful work, read in this order:
1. this file and any closer scoped `AGENTS.md`;
2. `.engineering/baseline.json` and `.engineering/commands.json`;
3. `.engineering/e2e.json` when a complete workflow or environment claim is affected;
4. `design/ux-contract.json` and `design/brand-kit.json` for meaningful UI/UX work;
5. `docs/README.md`, `docs/current-state.md`, and the owning architecture/feature/ADR source.

Aura adopts `daniele21/repo-template-sw` **0.9.2** with `typescript`, `android`, and `product-ui` profiles and L2 as the target engineering level.

## Product invariants

- The canonical financial ledger, budgets, reports, search and deterministic import logic remain local-first.
- Do not introduce silent cloud fallback, AI financial advice, AI transaction categorization, bank-account connectivity, or admin access to plaintext financial history without an explicit product/security decision.
- Android payment detection produces review candidates; candidates do not become canonical transactions without explicit user confirmation.
- Optional cloud backup remains client-side encrypted and opt-in; pending payment candidates remain outside backup/export surfaces unless a durable contract explicitly changes.
- Keep production and isolated Android debug Firebase/OAuth identities separate. Never commit credentials, keystores, signing material, `google-services.json`, or local environment files.

## Ownership map

- `src/domain/`: deterministic finance/reporting/import/search rules.
- `src/data/`: local persistence contracts and helpers.
- `src/context/`, `src/hooks/`: application orchestration/state.
- `src/pages/`, `src/components/`: shared product UI.
- `src/platform/`: typed web/native capability boundaries.
- `android/`: Capacitor Android shell, Kotlin plugins, native persistence/listener lifecycle.
- `brand-kit/`: canonical product visual guidelines/assets.
- `design/`: machine-readable product-experience contract.
- `adr/`: accepted project ADR records.
- `docs/`: architecture, privacy, operations, QA, specs and current-state routing.

## Delivery model

Aura uses a stable two-branch flow:

- `ITERATION`: feature branch work. Run the cheapest owner-local checks that can falsify the current change. Exact-head/full-diff/docs/preflight and broad E2E are not defaults while the implementation is still moving.
- `INTEGRATION` (`feature PR -> dev`): prove the affected observable outcome automatically. Exact head/base, full diff, affected durable docs, selected deterministic gates and affected critical E2E are required. `REAL_ENVIRONMENT` evidence is explicit but **does not block entry into `dev`**; it is `DEFERRED_TO_RELEASE`.
- `RELEASE` (`dev -> main`): FULL validation plus release-critical package/E2E/security evidence and every applicable required physical/target-environment confirmation.

The selector maps **risk dimensions -> required gates -> LEAN/SCOPED/STRONG/FULL summary**. Profiles are shorthand; concrete gates are authoritative. Parallel technical subtasks should converge early around a vertical outcome. Stacked publication is exceptional.

## Validation and E2E

Canonical intents are in `.engineering/commands.json`:
- `npm run check` — type/static checks plus engineering-contract health;
- `npm run test` — unit/integration tests;
- `npm run test:e2e:preflight` — bounded browser critical journeys;
- Android Gradle/instrumentation/WebView gates remain native and are selected when Android/product blast radius requires them.

For `INTEGRATION`, repository automation owns all automatable gates. Browser critical journeys run with success media; Android API 36 emulator journeys exercise the packaged debug APK and retain screenshots + continuous video. Material UI/UX journeys use `FULL_MEDIA`.

Physical/OEM/TalkBack/text-scaling/approved real payment-source evidence is `REAL_ENVIRONMENT`. It may be used early for diagnosis, but it is not the normal feature-to-`dev` blocker. When `.engineering/e2e.json` marks it `required`, it must be closed before `dev -> main` / release readiness.

If the current agent cannot execute a deterministic gate, classify it `REMOTE_AUTOMATED`; never turn the user into the test runner merely because the agent lacks the toolchain. Never present Playwright/browser or emulator evidence as physical-device evidence.

## Evidence reuse and failure discipline

Reuse trusted equivalent evidence before triggering expensive work. Before merge, evidence is exact-head. After a content-preserving merge into `dev`, reuse is allowed only when source tree, validated target/base, required gates/profile and material E2E claim remain equivalent. Direct pushes without equivalent evidence validate normally.

Classify failures as change regression, baseline, environment, flaky, base drift or assumption before editing. Fix the owning invariant; do not weaken tests or lower a profile to obtain green CI.

## Documentation lifecycle

Durable documentation must be current when moving to `INTEGRATION`, not after every private edit. `docs/README.md` owns routing. Treat README identity and README usage independently. `docs/current-state.md` owns integrated/blocked/next truth rather than implementation diaries. Completed workstreams are transferred into canonical owners and deleted by default.
