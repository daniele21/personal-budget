# Harnex-assisted Transaction Import V2

Status: ACTIVE

## Goal

Let an Aura Android user import a reasonably structured CSV/XLSX bank export without renaming/reordering columns: Aura discovers structure locally, Harnex assists with schema/category selection on-device, ambiguous results remain reviewable, and only the existing verified Aura commit path writes transactions.

## Boundary and non-goals

- Aura owns workflow, spreadsheet discovery, financial semantics, review, duplicates and ledger commit; Harnex owns caller authorization, use-case/model/runtime policy, Binder execution and lifecycle.
- Harnex is optional Android capability. Unavailable-Harnex Android/browser harnesses use manual mapping; no cloud fallback.
- Out of scope initially: PDF/OCR, `.xls`/`.xlsm`, arbitrary parsing expressions, FX/multi-currency normalization, bank connectivity and financial advice.
- Never send a complete workbook/ledger to Harnex, persist source/Harnex content metadata, add AI/import metadata to `Transaction`, create categories silently or let Aura select Harnex models.
- Preserve the canonical V1 `date,description,amount` fast path.

## Frozen contract owners

W0 is frozen in:

- feature contract: [`../specs/harnex-assisted-transaction-import-v2.md`](../specs/harnex-assisted-transaction-import-v2.md);
- trust/ownership decision: [`../../adr/0008-aura-harnex-assisted-import.md`](../../adr/0008-aura-harnex-assisted-import.md);
- privacy/data flow: [`../04-privacy-gdpr/harnex-assisted-import-processing-record.md`](../04-privacy-gdpr/harnex-assisted-import-processing-record.md).

Material changes to data fields, model authority, cloud/network behavior, persistence or category/ledger semantics must update the owning contract before implementation.

## Invariants / frozen direction

- Existing CSV/XLSX encoding, resource, ZIP, formula and row/file limits remain local and unchanged unless their owner changes explicitly.
- AI selects only Aura-generated candidate IDs. Unknown/missing/duplicate IDs fail closed to ambiguity/manual review.
- Confirmed mapping -> deterministic Aura extraction of date, description, signed amount and type. Unsafe silent mapping is a release blocker.
- Initial amount strategies: `signed-negative-expense`, `signed-positive-expense`, `debit-credit`, `amount-direction`; description may join bounded selected columns.
- Schema output is `resolved | ambiguous | unsupported`; correctness does not depend on LLM self-confidence.
- Category inference may return only supplied ephemeral category IDs or unresolved. Resolve conservative normalized-description + type matches from unambiguous local history first.
- Harnex use cases are local, stateless, JSON-schema constrained, content-free in ordinary logs, cancellable and cleanup-safe. Initial IDs: `aura-transaction-schema-inference`, `aura-transaction-category-classification`.
- Category batching is sequential and packed by advertised input budget, not a permanent row-count constant.
- Harnex failure never blocks manual import. Existing verified commit, ledger fingerprint, duplicate warning and undo semantics stay canonical.

## Source checkpoint

- Aura after W5: `dev@0177622e8194e0622b080b9db5d038566d5143e1`, tree `d065689ba94fe7d86d8596269af6b9e3a3c5631a`.
- Harnex after W3: `dev@fbe2a901e64c0cf5e3c329338d7b024c70bb15ba`, tree `8f34a8176542ac6090695d411e5e0364f782f119`.
- Integrated: Aura PRs #9 (W1), #10 (W2), #11 (W4), #12 (W5); Harnex PR #560 (W3). Dispatch issues are closed `completed`.
- W6/G1 is Aura PR #15: profiler + W5 mapping -> deterministic extraction -> canonical Prepare/Review/duplicate/fingerprint/verified commit, with Harnex absent.
- PR #15 selector `auto` resolved STRONG: repository health, web validation, browser FULL_MEDIA and Android emulator. Refresh exact head/base before readiness or merge claims.
- W9 remains independent; do not mix it into W6 commits. Any material edit invalidates earlier exact-head evidence.

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
| W0 Contract/privacy freeze | DONE | — | spec + ADR 0008 + processing record | Schema/category contracts, minimization, fallback, use-case semantics and local-first decision frozen. |
| W1 Multi-source corpus | DONE | W0 | `tests/fixtures/import-v2/**`, corpus tests | 21 synthetic source shapes define supported, ambiguous and rejected structures without model calls. |
| W2 Generic discovery/profiler | DONE | W0 | V2 domain/data profiler code + tests; no wizard | Bounded sheet/header/column profiles and Aura-owned executable date/amount candidates are integrated without network/Harnex. |
| W3 Harnex host capability | DONE | W0 | Harnex use-case/control-plane owners | Aura debug/release identities and two stateless JSON_SCHEMA use cases are integrated; unauthorized/disabled/unready fail closed. |
| W4 Aura Consumer bridge | DONE | W0 | Android Harnex + `src/platform/harnex*`; no parser/wizard | Published SDK connect/discover/activate/prepare/generate/cancel/cleanup is integrated behind Aura's typed Capacitor boundary. |
| W5 UX task/state contract | DONE | W0 | `design/` + isolated import-v2 components; no central wizard | Understand-file, editable mapping, unavailable/unready, progress, ambiguity, partial failure, retry/manual recovery, cancellation and accessibility semantics are implemented and independently testable. |
| W6 Manual vertical slice (G1) | ACTIVE | W1,W2,W5 | convergence owner, minimal central wiring | PR #15: unknown fixture -> manual mapping -> deterministic extraction -> existing review/duplicate/verified commit with Harnex absent; V1 fast path unchanged; exact-head STRONG evidence pending. |
| W7 Schema inference | BLOCKED | W2,W3,W4,W6 | schema intelligence adapters/tests | Harnex returns only candidate IDs; goldens reproduced; ambiguous/unsupported/invalid -> review/manual. |
| W8 Category engine | BLOCKED | W3,W4,W6 | category grouping/batch services/tests | Local history first; remaining groups sequential/payload-bounded; only supplied category IDs accepted; partial/failure remains reviewable. |
| W9 Cross-app/eval lane | READY | W3,W4 | canonical emulator/eval owners | Two-APK automation: host absent, pending/authorized, disabled/unready, schema/category success, cancel, reconnect; model-quality eval separate from deterministic CI. |
| W10 Integrated UX (G2) | BLOCKED | W7,W8,W9 | convergence owner, central import UI/services | Packaged Android: local discovery -> Harnex mapping -> deterministic extraction -> categories -> review -> verified commit; manual fallback first-class. |
| W11 Hardening/docs | BLOCKED | W10 | canonical privacy/security/spec/testing/current-state owners | Data flow, logging, auth, unavailable/offline, accessibility, limits, rollback and V1 compatibility current/tested. |
| W12 Integration preflight (G3) | BLOCKED | W11 | validation/evidence; owner fixes only | Refresh exact heads/bases; selector `auto` in each repo; required deterministic gates exact-head green; material UI has FULL_MEDIA. |
| W13 Release qualification | BLOCKED | W12 | release/QA evidence | Exact compatible Aura/Harnex candidates close required physical local-model/resource/accessibility/authorization evidence. |

## Parallel dispatch / ownership

W6/G1 and W9 are independent active/ready lanes. PR #15 owns only minimal Aura convergence; Harnex remains absent. W9 owns deterministic two-APK evidence and separate model evaluation. After W6 integrates, run W7 and W8 in parallel. W10 waits for W7/W8/W9.

Do not create a second wizard or duplicate Review/commit ownership. Shared central wizard/review/commit, build/E2E and durable architecture/privacy owners remain convergence-owned unless a lane proves a narrow prerequisite.

## Convergence and validation

- G1/W6 proves arbitrary-format import works manually before AI enters the main journey.
- W9 proves the real Aura APK and real Harnex APK/Host/Consumer boundary deterministically on emulator; host absence, pending/authorized policy, disabled/unready projection, schema/category structured calls, cancellation and reconnect are part of the automated contract.
- Real-model schema/category quality is separate evaluation evidence. It must not make normal CI flaky and does not substitute for deterministic two-APK lifecycle evidence.
- G2/W10 proves packaged Aura -> Capacitor -> published Harnex SDK -> Binder -> JSON_SCHEMA -> deterministic Aura extraction/classification -> review/commit on representative virtual Android.
- G3/W12 requires exact source identity, current docs, full diff review and selector-owned automated evidence. Missing local Android tooling is `REMOTE_AUTOMATED`, never user-run work.
- Pure contract/fixture/domain work expects LEAN/SCOPED; resource/security/native/Consumer/cross-app boundaries expect STRONG; selector/global/toolchain/release is FULL. Selector remains authoritative.
- Physical ARM64/JNI/GGUF model execution, memory/thermal/OEM behavior, Play signer topology and representative TalkBack/text scaling are `REAL_ENVIRONMENT` only when the release claim requires them.

## Executable now

- W6/G1 integration preflight on Aura PR #15.
- W9 cross-app deterministic integration and separate model-quality evaluation.

After PR #15 integrates, dispatch W7 Schema inference and W8 Category engine in parallel.

## Resume checkpoint

Aura `dev@0177622e8194e0622b080b9db5d038566d5143e1`; Harnex `dev@fbe2a901e64c0cf5e3c329338d7b024c70bb15ba`; W0-W5 integrated; W6 ACTIVE on Aura PR #15; W9 READY; W7/W8 blocked on W6; W10-W13 downstream-blocked. Next: exact-head STRONG preflight for PR #15 and independent W9 progress.

Record failed hypotheses with evidence pointers, deferred REAL_ENVIRONMENT obligations and the next discriminating action. Old successful runs are not evidence for a newer material head.

## Durable destinations

Before deleting this completed plan, transfer settled truth to owning `docs/specs/`, ADR/index, architecture, privacy/security, testing/E2E, `docs/current-state.md`, and executable code/tests as applicable.
