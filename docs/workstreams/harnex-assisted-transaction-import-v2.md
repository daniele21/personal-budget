# Harnex-assisted Transaction Import V2

Status: ACTIVE

## Goal

Let an Aura Android user import a reasonably structured CSV/XLSX bank export without renaming/reordering columns: Aura discovers structure locally, Harnex assists with schema/category selection on-device, ambiguous results remain reviewable, and only the existing verified Aura commit path writes transactions.

## Boundary and non-goals

- Aura owns workflow, spreadsheet discovery, financial semantics, review, duplicates and ledger commit; Harnex owns caller authorization, use-case/model/runtime policy, Binder execution and lifecycle.
- Harnex is optional Android capability. Web/PWA and unavailable-Harnex Android use manual mapping; no cloud fallback.
- Out of scope initially: PDF/OCR, `.xls`/`.xlsm`, arbitrary parsing expressions, FX/multi-currency normalization, bank connectivity and financial advice.
- Never send a complete workbook/ledger to Harnex, persist source/Harnex content metadata, add AI/import metadata to `Transaction`, create categories silently or let Aura select Harnex models.
- Preserve the canonical V1 `date,description,amount` fast path.

## Invariants / frozen direction

- Existing CSV/XLSX encoding, resource, ZIP, formula and row/file limits remain local and unchanged unless their owner changes explicitly.
- AI selects only Aura-generated candidate IDs. Unknown/missing/duplicate IDs fail closed to ambiguity/manual review.
- Confirmed mapping -> deterministic Aura extraction of date, description, signed amount and type. Unsafe silent mapping is a release blocker.
- Initial amount strategies: `signed-negative-expense`, `signed-positive-expense`, `debit-credit`, `amount-direction`; description may join bounded selected columns.
- Schema output is `resolved | ambiguous | unsupported`; correctness does not depend on an LLM self-confidence score.
- Category inference may return only supplied ephemeral category IDs or unresolved. Resolve conservative normalized-description + type matches from unambiguous local history first.
- Harnex use cases are local, stateless, JSON-schema constrained, content-free in ordinary logs, cancellable and cleanup-safe. Initial IDs: `aura-transaction-schema-inference`, `aura-transaction-category-classification`.
- Category batching is sequential and packed by advertised input budget, not a permanent row-count constant.
- Harnex failure never blocks manual import. Existing verified commit, ledger fingerprint, duplicate warning and undo semantics stay canonical.

## Source checkpoint

- Aura: `dev@48caa14a08cb15b7b6723da7a78139f50aa4eb46`, tree `709743faf62955a2a3b5ad43acd1501545eee286`.
- Harnex: `dev@0106ca889319023c436257a2b25bf216617e9062`, tree `419688188e8c03e37fd328bdc9670dfb990bf479`.
- Refresh both before cross-repo convergence/validation/readiness claims.
- V1 release obligations remain authoritative; early V2 lanes avoid current wizard/review/commit owners until G1.

## Material risks

| Risk | Level | Discriminating evidence |
| --- | --- | --- |
| Silent wrong schema | HIGH | Multi-source goldens; ambiguous cases require review; qualification unsafe-silent-mapping rate = 0. |
| Local model weak on date/amount semantics | HIGH | Real Harnex evaluation before automatic mapping reaches main wizard; narrow supported strategies if it fails. |
| Category suggestions ignore user taxonomy | MEDIUM | Same descriptions evaluated against multiple category sets; unknown IDs rejected locally. |
| Native/Harnex lifecycle leaks work/resources | HIGH | Cancel/close/background/reconnect tests across Capacitor + Consumer SDK. |
| Cross-repo API/policy drift | MEDIUM | Published Consumer SDK only; compatible version + Harnex direct-consumer/publication evidence. |
| V2 destabilizes V1 closure | MEDIUM | Isolated lane ownership; central import owners reserved for convergence. |

## Execution DAG

States: `READY | ACTIVE | BLOCKED | DONE`.

| ID | State | Depends | Owns/writes | Acceptance |
| --- | --- | --- | --- | --- |
| W0 Contract/privacy freeze | ACTIVE | — | owning specs/ADR/privacy + this plan | Schema/category contracts, data minimization, fallback, use-case semantics and non-goals are explicit; V1/local-first conflicts resolved. |
| W1 Multi-source corpus | BLOCKED | W0 | `tests/fixtures/import-v2/**`, corpus tests | >=18 synthetic shapes: canonical, debit/credit, signed, amount+direction, split description, ambiguous date/amount, title rows, multi-sheet, weak headers, EU decimals, unsupported currency, malformed/security/resource cases. |
| W2 Generic discovery/profiler | BLOCKED | W0 | new V2 domain/data profiler code + tests; no wizard | Bounded sheet/header/column profiles and Aura date/amount candidates without network/Harnex; existing safety tests stay green. |
| W3 Harnex host capability | BLOCKED | W0 | Harnex use-case/control-plane owners | Aura debug/release identities explicitly authorized for two stateless JSON_SCHEMA use cases; unavailable/unauthorized/disabled/unready are typed. |
| W4 Aura Consumer bridge | BLOCKED | W0 | new Android Harnex + `src/platform/harnex*`; no parser/wizard | Published SDK connect/discover/activate/prepare/generate/cancel/cleanup behind typed Capacitor boundary; web reports unavailable. |
| W5 UX task/state contract | BLOCKED | W0 | `design/` + isolated import-v2 components; no central wizard | Understand-file, mapping review, unavailable/unauthorized/unready, progress, ambiguity, partial failure, retry/manual recovery, responsive/accessibility states covered. |
| W6 Manual vertical slice (G1) | BLOCKED | W1,W2,W5 | convergence owner, minimal central wiring | Unknown fixture -> manual mapping -> deterministic extraction -> existing review/duplicate/verified commit with Harnex absent; V1 fast path unchanged. |
| W7 Schema inference | BLOCKED | W2,W3,W4,W6 | schema intelligence adapters/tests | Harnex returns only candidate IDs; goldens reproduced; ambiguous/unsupported/invalid -> review/manual. |
| W8 Category engine | BLOCKED | W3,W4,W6 | category grouping/batch services/tests | Local history first; remaining groups sequential/payload-bounded; only supplied category IDs accepted; partial/failure remains reviewable. |
| W9 Cross-app/eval lane | BLOCKED | W3,W4 | canonical emulator/eval owners | Two-APK automation: host absent, pending/authorized, disabled/unready, schema/category success, cancel, reconnect; model-quality eval separate from deterministic CI. |
| W10 Integrated UX (G2) | BLOCKED | W7,W8,W9 | convergence owner, central import UI/services | Packaged Android: local discovery -> Harnex mapping -> deterministic extraction -> categories -> review -> verified commit; manual fallback first-class. |
| W11 Hardening/docs | BLOCKED | W10 | canonical privacy/security/spec/testing/current-state owners | Data flow, logging, auth, unavailable/offline, accessibility, limits, rollback and V1 compatibility current/tested. |
| W12 Integration preflight (G3) | BLOCKED | W11 | validation/evidence; owner fixes only | Refresh exact heads/bases; selector `auto` in each repo; required deterministic gates exact-head green; material UI has FULL_MEDIA. |
| W13 Release qualification | BLOCKED | W12 | release/QA evidence | Exact compatible Aura/Harnex candidates close required physical local-model/resource/accessibility/authorization evidence. |

## Parallel dispatch / ownership

After W0 dispatch W1-W5 concurrently and merge independently valuable non-conflicting outcomes to each repo's `dev` after their own gates; avoid a stacked public PR tower.

- A/W1: fixture corpus only.
- B/W2: new V2 domain/data discovery only.
- C/W3: Harnex host policy/use cases only.
- D/W4: Aura Android/Capacitor Harnex boundary only.
- E/W5: UX semantics/isolated V2 components only.
- Central wizard/review/commit, export barrels, `MainActivity`, central Gradle/build config, `.engineering/e2e.json`, `docs/current-state.md` and shared architecture/privacy docs are convergence-owned unless a narrow prerequisite is coordinated.
- If a lane needs another owner, stop at the typed boundary and record the dependency; do not add compensating parallel state.

## Convergence and validation

- G1/W6 proves arbitrary-format import works manually before AI enters the main journey.
- G2/W10 proves packaged Aura -> Capacitor -> published Harnex SDK -> Binder -> JSON_SCHEMA -> deterministic Aura extraction/classification -> review/commit on representative virtual Android.
- G3/W12 requires exact source identity, current docs, full diff review and selector-owned automated evidence. Missing local Android tooling is `REMOTE_AUTOMATED`, never user-run work.
- Pure contract/fixture/domain work expects LEAN/SCOPED; resource/security/native/Consumer/cross-app boundaries expect STRONG; selector/global/toolchain/release is FULL. Selector remains authoritative.
- Real-model quality complements deterministic fake/golden CI; do not make normal CI flaky. Physical ARM64/GGUF resource/performance, Play signer topology and TalkBack/text scaling are REAL_ENVIRONMENT only when the release claim requires them.

## Executable now

- W0 only. Prepare W1-W5 task boundaries during W0, but do not let parallel lanes invent unresolved semantics.

## Resume checkpoint

Record current Aura/Harnex head/tree/base, W0-W13 states, frozen/changed decisions, failed hypotheses with evidence pointers, deferred REAL_ENVIRONMENT obligations and next discriminating action. Old successful runs are not evidence for a newer material head.

## Durable destinations

Before deleting this completed plan, transfer settled truth to owning `docs/specs/`, ADR/index, architecture, privacy/security, testing/E2E, `docs/current-state.md`, and executable code/tests as applicable.
