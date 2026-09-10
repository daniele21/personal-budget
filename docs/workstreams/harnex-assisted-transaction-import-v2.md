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

- Aura integration base for W10: `dev@4d816359470a0bff2d2397b567faa117ec1e4c89` (PR #21 integrated).
- Harnex repair candidate used by current Aura CI is `85f1959308b02fae6d38cc540a30e78f10846725` on Harnex PR #565; the previous fixture was `d60c0ff9560d6eed225e4fd6e02e746f18625935`.
- Integrated Aura lanes: PR #9 (W1), #10 (W2), #11 (W4), #12 (W5), #15 (W6), #19 (W7), #20 (W8), #21 (W9 implementation); Harnex PR #560 (W3).
- `dev@4d816359470a0bff2d2397b567faa117ec1e4c89` passed Repository health run #85 (`34276168216`) for its web/build/browser jobs, but its two-APK lifecycle evidence is invalid: Harnex crashed on a Room main-thread access and Aura's shell orchestrator accepted the AndroidJUnitRunner failure as PASS. Do not reuse that run as W9 cross-app success evidence.
- W9 repair moves the Harnex emulator shell bridge off the main thread and makes Aura parse AndroidJUnitRunner terminal output fail-closed. W9 returns to DONE only after exact candidate two-APK evidence passes without masked failures.
- W10 implementation branch: `feat/import-v2-integrated-ux-w10`, based on the `dev` checkpoint above. Exact-head evidence must be refreshed after every material W10 edit.

## Material risks

| Risk | Level | Discriminating evidence |
| --- | --- | --- |
| Silent wrong schema | HIGH | Multi-source goldens; ambiguous/invalid assistance always requires editable confirmation; qualification unsafe-silent-mapping rate = 0. |
| Local model weak on date/amount semantics | HIGH | Real Harnex evaluation remains separate release qualification; deterministic CI never trusts model self-confidence. |
| Category suggestions ignore user taxonomy | MEDIUM | Local active-category validation rejects unknown IDs before review state changes. |
| Native/Harnex lifecycle leaks work/resources | HIGH | Cancel/close/retry/reconnect tests across Capacitor + Consumer SDK and two-APK automation. |
| Cross-repo API/policy drift | MEDIUM | Published Consumer SDK only; exact Harnex fixture/source identity in remote preflight. |
| V2 destabilizes V1 closure | MEDIUM | V1 fast path remains separate and existing deterministic import tests stay required. |

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
| W6 Manual vertical slice (G1) | DONE | W1,W2,W5 | convergence owner, minimal central wiring | Unknown fixture -> manual mapping -> deterministic extraction -> existing review/duplicate/verified commit with Harnex absent; V1 fast path unchanged. |
| W7 Schema inference | DONE | W2,W3,W4,W6 | schema intelligence adapters/tests | PR #19 integrated bounded Harnex candidate selection; ambiguous/unsupported/invalid fail closed. |
| W8 Category engine | DONE | W3,W4,W6 | category grouping/batch services/tests | PR #20 integrated local-history-first grouping, bounded sequential Harnex batches and supplied-ID validation with review-safe partial failure. |
| W9 Cross-app/eval lane | ACTIVE | W3,W4 | canonical emulator/eval owners | Repair false-positive two-APK evidence: Harnex emulator control must not access Room on the main thread and Aura must reject failed AndroidJUnitRunner output; then re-prove host absent/authorization/schema/category/cancel/reconnect on exact candidates. |
| W10 Integrated UX (G2) | BLOCKED | W7,W8,W9 | convergence owner, central import UI/services | Implementation is present; validation resumes after W9 repair, then prove packaged Android local discovery -> Harnex mapping -> deterministic extraction -> categories -> review -> verified commit with manual fallback first-class. |
| W11 Hardening/docs | BLOCKED | W10 | canonical privacy/security/spec/testing/current-state owners | Data flow, logging, auth, unavailable/offline, accessibility, limits, rollback and V1 compatibility current/tested. |
| W12 Integration preflight (G3) | BLOCKED | W11 | validation/evidence; owner fixes only | Refresh exact heads/bases; selector `auto`; required deterministic gates exact-head green; material UI has FULL_MEDIA. |
| W13 Release qualification | BLOCKED | W12 | release/QA evidence | Exact compatible Aura/Harnex candidates close required physical local-model/resource/accessibility/authorization evidence. |

## W10 convergence status

Current W10 implementation preserves the existing central wizard/review/commit ownership and adds only orchestration around already-integrated W7/W8 services:

- Android arbitrary-format imports may request bounded Harnex schema assistance after Aura local profiling; resolved output pre-fills only Aura candidate IDs and is still explicitly reviewed/confirmed in the mapping editor.
- Ambiguous, unsupported, unauthorized, unavailable or cancelled schema assistance retains editable manual mapping and cannot commit anything.
- Confirmed mapping is executed by Aura deterministic extraction before category assistance starts.
- Category resolution uses local history first, then bounded Harnex suggestions only for unresolved groups; accepted suggestions are validated against active Aura categories and applied to ephemeral review state.
- Partial/unavailable/cancelled category assistance preserves completed safe suggestions and lets the user continue to the existing Review path with unresolved rows visible.
- Suggestion provenance exists only in prepared review state; canonical `Transaction` persistence remains unchanged.
- Browser regression continues through the Harnex-absent manual path; V1 canonical imports do not enter Harnex orchestration.

## Convergence and validation

- G1/W6 proves arbitrary-format import works manually before AI enters the main journey.
- W9 proves the real Aura APK and real Harnex APK/Host/Consumer boundary deterministically on emulator; host absence, pending/authorized policy, disabled/unready projection, schema/category structured calls, cancellation and reconnect are part of the automated contract. A PASS marker is valid only when the selected AndroidJUnitRunner test itself has a successful terminal status.
- Real-model schema/category quality is separate evaluation evidence. It must not make normal CI flaky and does not substitute for deterministic two-APK lifecycle evidence.
- G2/W10 requires the central user flow plus representative virtual Android evidence. Material UI evidence is `FULL_MEDIA`; lower-level two-APK assertions alone are not sufficient to call W10 done.
- G3/W12 requires exact source identity, current docs, full diff review and selector-owned automated evidence. Missing local Android tooling is `REMOTE_AUTOMATED`, never user-run work.
- Physical ARM64/JNI/GGUF model execution, memory/thermal/OEM behavior, Play signer topology and representative TalkBack/text scaling remain `REAL_ENVIRONMENT` release evidence, not ordinary integration blockers.

## Executable now

- Complete W9 evidence repair with Harnex PR #565 plus Aura fail-closed instrumentation parsing, and validate exact candidate identity through repository-owned automation.
- After W9 is truthful again, resume W10 G2 packaged UI validation on the same exact Aura/Harnex candidates.
- Browser `FULL_MEDIA` remains required for W10; an external Playwright dependency-install failure is an environment/toolchain blocker, not substitute evidence.
- W11 begins only after W10 G2 evidence is green and the workstream checkpoint is updated.

## Resume checkpoint

Aura base `dev@4d816359470a0bff2d2397b567faa117ec1e4c89`; W0-W8 integrated; W9 ACTIVE on evidence repair using Harnex candidate `85f1959308b02fae6d38cc540a30e78f10846725`; W10 implementation exists but is BLOCKED on W9 truthful cross-app evidence; W11-W13 downstream-blocked. Next discriminating action: run selector-owned exact-head automation against the repaired Harnex fixture and fail-closed Aura runner, then resume W10 G2 only if W9 passes.

Record failed hypotheses with evidence pointers, deferred REAL_ENVIRONMENT obligations and the next discriminating action. Old successful runs are not evidence for a newer material head.

## Durable destinations

Before deleting this completed plan, transfer settled truth to owning `docs/specs/`, ADR/index, architecture, privacy/security, testing/E2E, `docs/current-state.md`, and executable code/tests as applicable.