# Aura Finance agent guide

## Mission and authority

Aura Finance is a private, Android-first personal-finance application. Preserve the project identity and privacy/local-first promises in `README.md`; ordinary engineering truth is owned by the target repository, not by remembered template state.

For meaningful work, read in this order:
1. this file and any closer scoped `AGENTS.md`;
2. `.engineering/baseline.json` and `.engineering/commands.json`;
3. `.engineering/e2e.json` when a complete workflow or environment claim is affected;
4. `design/ux-contract.json` and `design/brand-kit.json` for meaningful UI/UX work;
5. `docs/README.md`, `docs/current-state.md`, and the owning architecture/feature/ADR source.

The adopted engineering source is `daniele21/repo-template-sw` v0.8.0 with profiles `typescript`, `android`, and `product-ui`, targeting L2 semantics with native project tooling.

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
- `design/`: machine-readable product-experience contract that routes to the canonical UI/brand owners.
- `adr/`: accepted project ADR records.
- `docs/`: architecture, privacy, operations, QA, specs and current-state routing.

## Change discipline

- Find the canonical owner before adding configuration, policy, state, components or adapters.
- Use `skills/structured-change/SKILL.md` for meaningful behavior/architecture/persistence/security/build/UI changes.
- For structural or interaction-level UX work, use `skills/design-product-experience/SKILL.md` before implementation. Start from user outcome/task/IA/hierarchy, not visual polish.
- Keep advanced/diagnostic complexity progressively disclosed and preserve Android/platform conventions, accessibility and reduced-motion behavior.
- Do not add wrappers only to rename native npm/Playwright/Gradle/Capacitor commands. `.engineering/commands.json` is the routing contract.
- Resource owners must cover success, failure, timeout, cancellation, interruption and partial initialization. No unbounded process/listener/test residue.

## Validation and publication

Use the narrowest sufficient validation while iterating, then `skills/preflight-change/SKILL.md` before publication.

Canonical intents are in `.engineering/commands.json`. In particular:
- `npm run check` — type/static checks plus engineering-contract health;
- `npm run test` — unit/integration tests;
- `npm run test:e2e` — browser critical-journey regression;
- Android Gradle/instrumentation/WebView gates remain native and are selected when Android blast radius requires them.

If the current agent cannot execute a deterministic gate, classify it `REMOTE_AUTOMATED`; do not turn the user into a test runner. Physical/OEM/TalkBack/signing evidence is `REAL_ENVIRONMENT` only when the claim genuinely depends on it. Never present Playwright/browser or emulator evidence as physical-device evidence.

## Documentation lifecycle

Code and durable documentation ship together. `docs/README.md` owns documentation routing.

Treat README identity and README usage independently:
- preserve still-valid mission, positioning and product explanation;
- update prerequisites, setup, commands, configuration and usage whenever behavior changes.

Keep current workstreams in `docs/workstreams/` only when persistent coordination is justified. Completed workstreams are transferred into code/tests/canonical docs and deleted by default. Do not maintain implementation diaries in durable docs.
