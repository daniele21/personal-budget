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

- Aura integrated base through W9: `dev@4d816359470a0bff2d2397b567faa117ec1e4c89`.
- Harnex integrated fixture used by Aura W9: `dev@d60c0ff9560d6eed225e4fd6e02e746f18625935`.
- Integrated Aura lanes: PR #9 (W1), #10 (W2), #11 (W4), #12 (W5), #15 (W6), #19 (W7), #20 (W8), #21 (W9). Harnex host/cross-app prerequisites are integrated through PRs #560 and #563.
- W7 adds bounded Harnex schema inference with candidate-ID-only output and canonical mapping revalidation; W8 adds local-history-first categorization with payload-bounded sequential Harnex fallback; W9 adds deterministic two-APK host/policy/schema/category/cancel/reconnect/restart evidence.
- W9 exact-head repository-health run #84 (`34274853743`) passed on Aura head `d0d0af84dd36361132709436fa2e6742602e30b7` against the integrated Harnex fixture above.
- W10 implementation candidate starts from fresh `dev@4d816359470a0bff2d2397b567faa117ec1e4c89`; refresh exact heads/bases before readiness, convergence or release claims because material edits invalidate affected evidence.

## Material risks

| Risk | Level | Discriminating evidence |
| --- | --- | --- |
| Silent wrong schema | HIGH | Multi-source goldens; resolved suggestions remain editable and require explicit mapping confirmation; ambiguous cases require review; qualification unsafe-silent-mapping rate = 0. |
| Local model weak on date/amount semantics | HIGH | Real Harnex evaluation before release qualification; deterministic candidate validation remains authoritative and supported strategies narrow if needed. |
| Category suggestions ignore user taxonomy | MEDIUM | Same descriptions evaluated against multiple category sets; unknown IDs rejected locally; every suggestion remains editable in Review. |
| Native/Harnex lifecycle leaks work/resources | HIGH | Cancel/close/retry/reconnect tests across Capacitor + Consumer SDK and two-APK automation. |
| Cross-repo API/policy drift | MEDIUM | Published Consumer SDK only; compatible version + Harnex direct-consumer/publication evidence. |
| V2 destabilizes V1 closure | MEDIUM | V1 fast path regression coverage plus convergence tests that enter assistance only for `mapping-required` V2 inputs. |

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
| W6 Manual vertical slice (G1) | DONE | W1,W2,W5 | convergence owner, minimal central wiring | Unknown fixture -> manual mapping -> deterministic extraction -> existing review/duplicate/verified commit with Harnex absent; V1 fast path unchanged; exact-head STRONG evidence integrated via PR #15. |
| W7 Schema inference | DONE | W2,W3,W4,W6 | schema intelligence adapters/tests | PR #19: Harnex returns only Aura candidate IDs; resolved suggestions are revalidated; ambiguous/unsupported/invalid/unavailable fail closed to review/manual. |
| W8 Category engine | DONE | W3,W4,W6 | category grouping/batch services/tests | PR #20: local history first; remaining groups sequential/payload-bounded; only supplied category IDs accepted; partial/failure remains reviewable. |
| W9 Cross-app/eval lane | DONE | W3,W4 | canonical emulator/eval owners | PR #21 + Harnex #563: deterministic two-APK host absent, pending/authorized, disabled/unready, schema/category success, cancel, reconnect and process-restart coverage; real model quality remains separate release evidence. |
| W10 Integrated UX (G2) | ACTIVE | W7,W8,W9 | convergence owner, central import UI/services | Candidate converges discovery -> optional Harnex mapping -> explicit confirmation -> deterministic extraction -> local-history/Harnex categories -> Review -> verified commit; packaged WebView evidence now crosses Capacitor/Harnex before returning to canonical Review/commit. Exact-head automated preflight is still required before DONE. |
| W11 Hardening/docs | BLOCKED | W10 | canonical privacy/security/spec/testing/current-state owners | Data flow, logging, auth, unavailable/offline, accessibility, limits, rollback and V1 compatibility current/tested. |
| W12 Integration preflight (G3) | BLOCKED | W11 | validation/evidence; owner fixes only | Refresh exact heads/bases; selector `auto` in each repo; required deterministic gates exact-head green; material UI has FULL_MEDIA. |
| W13 Release qualification | BLOCKED | W12 | release/QA evidence | Exact compatible Aura/Harnex candidates close required physical local-model/resource/accessibility/authorization evidence. |

## W10 convergence checkpoint

The current W10 candidate intentionally extends existing owners rather than creating another workflow:

- `ImportWizardDialog` enters schema assistance only for the V2 `mapping-required` result. V1 structured validation still goes directly to deterministic preparation and Review.
- A resolved Harnex schema result pre-populates the existing mapping editor but never confirms it; user confirmation still gates `executeImportV2Mapping`.
- Confirmed mapping executes Aura-owned extraction before any categorization. Blocking mapped-row validation returns to the editor.
- Category resolution starts from local history, then invokes Harnex only for unresolved groups through W8. Suggestions are applied through the existing `applyImportCategory` Review command and remain editable.
- Partial category success is preserved across Continue and Retry. Unresolved rows stay `Uncategorized`; Harnex unavailability/cancellation never discards prepared rows or blocks Review.
- Session reset/close cancels active assistance and revision-gates stale async completions. No assistance path calls the ledger commit owner.
- The only transaction write remains the existing verified `commitPreparedTransactionImport` path after Review and final confirmation; duplicate, fingerprint and undo semantics are unchanged.
- The W9 two-APK runner now adds a packaged Aura WebView journey that injects a synthetic V2 CSV, observes a real Harnex-assisted mapping through Capacitor/Consumer/Binder, explicitly confirms it, observes category suggestions in Review, then exercises Aura's verified commit.

## Convergence and validation

- G1/W6 proves arbitrary-format import works manually before AI enters the main journey.
- W9 proves the real Aura APK and real Harnex APK/Host/Consumer boundary deterministically on emulator; host absence, pending/authorized policy, disabled/unready projection, schema/category structured calls, cancellation and reconnect are part of the automated contract.
- Real-model schema/category quality is separate evaluation evidence. It must not make normal CI flaky and does not substitute for deterministic two-APK lifecycle evidence.
- G2/W10 proves packaged Aura -> WebView -> Capacitor -> published Harnex SDK -> Binder -> JSON_SCHEMA -> explicit mapping confirmation -> deterministic Aura extraction/classification -> existing Review/verified commit on representative virtual Android.
- W10 is a material central UI + cross-app integration change. Validation starts with selector `auto`; required browser UI evidence is `FULL_MEDIA` at integration, while Android/package/two-APK deterministic work is `REMOTE_AUTOMATED` when equivalent local Android tooling is unavailable.
- G3/W12 requires exact source identity, current docs, full diff review and selector-owned automated evidence. Missing local Android tooling is `REMOTE_AUTOMATED`, never user-run work.
- Pure contract/fixture/domain work expects LEAN/SCOPED; resource/security/native/Consumer/cross-app boundaries expect STRONG; selector/global/toolchain/release is FULL. Selector remains authoritative.
- Physical ARM64/JNI/GGUF model execution, production-model quality/latency, memory/thermal/OEM behavior, Play signer topology and representative TalkBack/text scaling are `REAL_ENVIRONMENT` only when the release claim requires them.

## Executable now

- Finish W10 integration preflight on the exact candidate head: complete diff review, selector `auto`, required unit/component/build/browser FULL_MEDIA and packaged Android/two-APK gates through repository-owned automation.
- Diagnose and repair any failed gate at its canonical owner; do not weaken tests or fall back to user-run deterministic validation.
- After W10 is integrated, proceed to W11 hardening/docs, then W12 integration preflight and W13 release qualification.

## Resume checkpoint

Aura base `dev@4d816359470a0bff2d2397b567faa117ec1e4c89`; W0-W9 integrated. W10 implementation is active on `feat/import-v2-integrated-ux` from that base; implementation publication and exact-head validation must be refreshed from live GitHub when resuming. W11-W13 remain downstream-blocked.

Record failed hypotheses with evidence pointers, deferred REAL_ENVIRONMENT obligations and the next discriminating action. Old successful runs are not evidence for a newer material head.

## Durable destinations

Before deleting this completed plan, transfer settled truth to owning `docs/specs/`, ADR/index, architecture, privacy/security, testing/E2E, `docs/current-state.md`, and executable code/tests as applicable.
