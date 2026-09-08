# Harnex-assisted Transaction Import V2

Status: ACTIVE

## Goal

Allow an Aura Android user to import a reasonably structured CSV/XLSX bank export without first renaming/reordering columns: Aura discovers the file locally, Harnex assists with schema selection and category classification on-device, the user can review/correct ambiguous results, and only the existing verified Aura commit path writes canonical transactions.

## Product boundary

- Aura owns the user workflow, spreadsheet discovery, deterministic financial semantics, review, duplicate handling and ledger commit.
- Harnex owns Android caller authorization, use-case policy, model/runtime selection, Binder execution, cancellation and resource lifecycle.
- Harnex is an optional Android capability. Web/PWA and Harnex-unavailable Android paths retain a manual mapping/import path.
- No cloud fallback, bank-account connectivity, financial advice or silent ledger mutation is introduced.

## Non-goals

- PDF/OCR, `.xls`/`.xlsm`, arbitrary formulas or a general spreadsheet ETL language.
- FX conversion or multi-currency normalization in the first V2 slice; keep EUR-only ledger semantics unless a separate contract changes.
- Sending a complete workbook/ledger to Harnex, persisting source files or Harnex prompt/output metadata, or adding AI/import metadata to `Transaction`.
- Letting Harnex create categories, choose Aura business rules, choose its own model from Aura, or emit executable parsing expressions.
- Replacing the canonical V1 `date,description,amount` fast path where it is already sufficient.

## Invariants

- Existing CSV/XLSX resource, encoding, ZIP, formula and row/file safety limits remain owned locally and are not weakened for AI assistance.
- AI may select only Aura-generated candidate IDs/strategies. Unknown/missing/duplicate IDs fail closed to ambiguity/manual review.
- After a mapping is confirmed, extraction of date, description, signed amount and transaction type is deterministic Aura code.
- Ambiguous schema decisions are user-reviewable; unsafe silent mapping is a release blocker.
- Category inference may select only ephemeral IDs for the user's supplied active categories or return unresolved; no invented category enters the ledger.
- Category work is deduplicated by conservative normalized description + transaction type; known unambiguous local history resolves before Harnex.
- Harnex inference is local Android-only, stateless for this workflow, content-free in ordinary logs/telemetry, cancellable and cleaned on every exit path.
- Harnex/model/runtime failure never blocks the manual import path.
- Existing verified commit, ledger fingerprint, duplicate-warning and undo semantics remain canonical unless an explicit owning contract changes.

## Frozen candidate strategies for M0

- Date candidates: Aura-supported deterministic date parsers only.
- Description: one or more selected text columns joined by a bounded Aura-owned rule.
- Amount candidates: `signed-negative-expense`, `signed-positive-expense`, `debit-credit`, `amount-direction`.
- Harnex schema result: `resolved | ambiguous | unsupported`; do not rely on uncalibrated numeric confidence for correctness.
- Category batches: one Harnex generation at a time; pack by advertised input budget rather than a permanently fixed row count.
- Initial Harnex use cases: `aura-transaction-schema-inference` and `aura-transaction-category-classification`, JSON-schema constrained, stateless, host-owned deterministic preset/model binding.

## Source checkpoint

- Aura base: `dev@48caa14a08cb15b7b6723da7a78139f50aa4eb46`, tree `709743faf62955a2a3b5ad43acd1501545eee286`.
- Harnex reference: `dev@0106ca889319023c436257a2b25bf216617e9062`, tree `419688188e8c03e37fd328bdc9670dfb990bf479`.
- Refresh both identities before cross-repository convergence, remote validation or any readiness claim.
- Aura V1 import release/acceptance obligations remain authoritative; early V2 lanes must avoid modifying current wizard/review/commit owners until the first convergence slice is ready.

## Risks and cheapest discriminating evidence

| Risk | Level | Evidence / stop condition |
| --- | --- | --- |
| Wrong schema silently corrupts financial meaning | HIGH | Multi-source goldens; ambiguous cases must resolve to review, not a guessed mapping; unsafe silent mapping rate must be zero in the qualification corpus. |
| Local model cannot reliably distinguish date/amount semantics | HIGH | Harnex real-model evaluation on synthetic source shapes before automatic mapping is wired into the main wizard. Narrow candidate strategies or keep manual-only for unsupported shapes if evidence fails. |
| Category suggestions ignore user taxonomy | MEDIUM | Evaluate the same descriptions against multiple renamed/restructured category sets; unknown IDs are rejected locally. |
| Native/Harnex lifecycle leaves work/resources active | HIGH | Cancel/close/background/reconnect tests across Capacitor bridge + Harnex Consumer lifecycle; no orphan session/activation. |
| Cross-repo API/policy drift | MEDIUM | Consume only published Consumer SDK; pin compatible version and require Harnex direct-consumer/publication evidence when its public surface changes. |
| V2 destabilizes V1 release closure | MEDIUM | Parallel lanes use isolated write boundaries; central wizard/review/commit files are convergence-owned only. |
| Large source causes latency/memory regressions | MEDIUM | Local profiling stays bounded; Harnex sees samples/groups only; measure representative Android payload/latency before release. |

## Execution DAG

States are `READY`, `ACTIVE`, `BLOCKED`, `DONE`. Each lane owns its write boundary until an explicit convergence task takes over.

| ID | State | Depends on | Owns/writes | Acceptance / validation |
| --- | --- | --- | --- | --- |
| W0 Contract + privacy freeze | ACTIVE | — | `docs/specs/`, `adr/`, privacy owners as needed; this workstream | Final schema/category contracts, data-minimization boundary, Android/manual fallback, Harnex use-case semantics and non-goals are explicit; material conflict with V1/local-first is resolved rather than guessed. |
| W1 Multi-source corpus | BLOCKED | W0 | `tests/fixtures/import-v2/**`, new corpus tests only | >=18 synthetic source shapes cover canonical, debit/credit, signed, amount+direction, split descriptions, ambiguous dates/amounts, title rows, multi-sheet, weak headers, EU decimals, unsupported currency, malformed/security/resource cases with golden expectations. |
| W2 Generic discovery + profiler | BLOCKED | W0 | new `src/domain/import/v2/**`, `src/data/import/*profile*`, focused tests; no wizard | CSV/XLSX can produce bounded sheets/header/column profiles and Aura-owned date/amount candidates without network/Harnex; existing safety limits remain green. |
| W3 Harnex host capability | BLOCKED | W0 | Harnex control-plane/use-case owners + scoped tests/docs only | Debug/release Aura identities can be explicitly authorized for two scoped stateless JSON_SCHEMA use cases; unavailable/unauthorized/disabled/model-unready paths are typed and content-free. |
| W4 Aura native Consumer bridge | BLOCKED | W0 | `android/**/harnex/**`, new `src/platform/harnex*`, dependency/config + focused tests; no wizard/parser owner | Published `consumer-android` SDK connects/discovers/activates/prepares/generates/cancels/cleans through a typed Capacitor boundary; web implementation reports unavailable without fallback. |
| W5 UX task/state contract | BLOCKED | W0 | `design/` affected contract/docs and isolated `src/components/import/v2/**`; no `ImportWizardDialog.tsx` | Task model covers understand-file, mapping review, Harnex unavailable/unauthorized/model-unready, progress, ambiguity, partial category failure, retry/manual recovery, responsive/accessibility states. |
| W6 Manual arbitrary-source vertical slice (G1) | BLOCKED | W1,W2,W5 | convergence owner: wizard/service barrels + minimal central wiring; existing commit owner read-only unless required | Unknown-format fixture -> manual mapping -> deterministic extraction -> existing review/duplicate/verified commit works with Harnex absent; canonical V1 path is not regressed. |
| W7 Schema inference adapter | BLOCKED | W2,W3,W4,W6 | new schema-intelligence service/adapters + tests; central wizard only via convergence owner | Harnex selects only candidate IDs; resolved mapping reproduces goldens; ambiguous/unsupported/invalid responses fall back to review/manual path. |
| W8 Local/category batch engine | BLOCKED | W3,W4,W6 | new category-resolution/grouping/batch services + tests; no ledger schema changes | Unambiguous ledger history resolves first; remaining groups are payload-bounded, sequential Harnex batches; only supplied category IDs accepted; missing/partial/failure remains reviewable. |
| W9 Harnex/Aura cross-app eval lane | BLOCKED | W3,W4 | repository-owned emulator/eval fixtures in the canonical test owner(s) | Two-APK automation covers host absent, pending/authorized, disabled/unready, schema success, category success, cancellation and reconnect; model-quality corpus is separated from deterministic unit CI. |
| W10 Integrated UX convergence (G2) | BLOCKED | W7,W8,W9 | convergence owner: `ImportWizardDialog.tsx`, affected import components/services | Packaged Android path performs local discovery -> Harnex-assisted mapping -> deterministic extraction -> category assistance -> human review -> verified commit; manual fallback remains first-class. |
| W11 Hardening + privacy/docs | BLOCKED | W10 | affected canonical privacy/security/spec/testing/current-state owners | Data flow, logging, retention, authorization, offline/unavailable behavior, accessibility, limits, support/rollback and V1 compatibility are current and tested. |
| W12 Integration preflight (G3) | BLOCKED | W11 | validation/evidence only unless root cause requires owner fix | Refresh exact Aura/Harnex heads and bases; selector `auto` on each changed repo; all required deterministic gates pass on exact candidates; material Aura UI journey has required FULL_MEDIA; no failed/pending gate hidden. |
| W13 Release qualification | BLOCKED | W12 | release/QA evidence owners | Exact compatible Aura/Harnex release candidates pass required physical Android/local-model/resource/accessibility/authorization evidence; remaining REAL_ENVIRONMENT gaps are explicit until closed. |

## Parallel dispatch and write ownership

Immediately after W0, dispatch W1-W5 concurrently. Do not create a stacked public PR tower: merge independently valuable, non-conflicting outcomes into each repository's `dev` after their own integration gates, then refresh this checkpoint.

- Lane A / W1 owns fixture corpus only.
- Lane B / W2 owns new V2 domain/data discovery code only.
- Lane C / W3 owns Harnex host policy/use-case configuration only.
- Lane D / W4 owns Aura Android/Capacitor Harnex boundary only.
- Lane E / W5 owns UX semantics and isolated V2 components only.
- `ImportWizardDialog.tsx`, existing `ReviewStep.tsx`, commit service, export barrels, `MainActivity` registration, central Gradle/build config, `.engineering/e2e.json`, `docs/current-state.md` and shared architecture/privacy docs are convergence-owned unless a lane explicitly coordinates a narrow prerequisite change.
- If a lane needs another lane's owner, stop at the typed boundary and record the dependency instead of patching around it.

## Convergence gates

### G1 — deterministic/manual vertical slice

W6 proves arbitrary-format import is useful without Harnex. This is required before making AI availability part of the main import journey.

### G2 — real local-AI vertical slice

W10 proves packaged Aura -> Capacitor -> published Harnex Consumer SDK -> Binder -> assigned use case -> JSON_SCHEMA result -> deterministic Aura extraction/classification -> user review/commit on a representative virtual Android environment.

### G3 — integration candidate

W12 requires current durable docs, full diff review, exact head/base identity and selector-owned automated gates. Missing local Android tooling is `REMOTE_AUTOMATED`, not user-run work.

## Validation model

- Pure contracts/fixtures/domain changes: selector-owned LEAN/SCOPED unless risk escalates.
- Spreadsheet resource/security boundaries, Consumer SDK/Gradle/native lifecycle, cross-app authorization and shared contracts: expect STRONG; selector remains authoritative.
- Selector/global CI/toolchain changes or release promotion: FULL.
- Model-quality evaluation is evidence, not a flaky replacement for deterministic CI. Keep golden contract tests with fakes in normal CI and run real Harnex model evaluation in the appropriate repository-owned automated/representative lane.
- Physical ARM64/GGUF latency-memory-thermal, Play-installed signer topology and TalkBack/text-scaling are REAL_ENVIRONMENT only when the release claim requires them; emulator evidence does not substitute.

## Executable now

- `W0 Contract + privacy freeze`.
- During W0, prepare task boundaries for W1-W5 but do not let implementation lanes invent unresolved contract semantics independently.

## Resume checkpoint

On resume record only: current Aura head/tree/base, current Harnex head/tree/base, W0-W13 states, changed/frozen decisions, failed hypotheses with evidence pointers, deferred REAL_ENVIRONMENT obligations and the next discriminating action. Old successful runs are not evidence for a newer material head.

## Durable destinations

Before deleting this completed workstream, transfer settled truth to the canonical owners as applicable:

- feature/import behavior: `docs/specs/` and `docs/features/README.md`;
- accepted trust/ownership decisions: `/adr/` + ADR index;
- architecture routing: `docs/architecture.md` / `docs/01-architecture/`;
- privacy/data lifecycle: `docs/04-privacy-gdpr/`, `SECURITY.md`;
- QA/evidence routing: `docs/testing-strategy.md`, `.engineering/e2e.json` when a durable critical journey changes;
- current integrated state/gaps: `docs/current-state.md`;
- executable truth: domain/native/platform code and deterministic/cross-app/E2E tests.
