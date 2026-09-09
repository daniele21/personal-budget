# Harnex-assisted Transaction Import V2

Status: ACTIVE

## Goal

Let an Aura Android user import reasonably structured CSV/XLSX without renaming columns: Aura discovers structure locally, Harnex optionally assists schema/category selection on-device, ambiguity stays reviewable, and only Aura's verified commit path writes transactions.

## Boundaries

- Aura owns workflow, spreadsheet discovery, financial semantics, Review, duplicates and ledger commit; Harnex owns caller authorization, use-case/model/runtime policy and Binder lifecycle.
- Harnex is optional. Missing, unauthorized, unready or unavailable Harnex must leave manual import usable; there is no cloud fallback.
- Out of scope initially: PDF/OCR, `.xls`/`.xlsm`, arbitrary parsing expressions, FX normalization, bank connectivity and financial advice.
- Never send a complete workbook/ledger to Harnex, persist source/Harnex content metadata, add AI/import fields to `Transaction`, silently create categories or let Aura select Harnex models.
- Preserve the V1 `date,description,amount` fast path.

## Contract owners

Settled behavior lives in:

- [`../specs/harnex-assisted-transaction-import-v2.md`](../specs/harnex-assisted-transaction-import-v2.md)
- [`../../adr/0008-aura-harnex-assisted-import.md`](../../adr/0008-aura-harnex-assisted-import.md)
- [`../04-privacy-gdpr/harnex-assisted-import-processing-record.md`](../04-privacy-gdpr/harnex-assisted-import-processing-record.md)

Material changes to transferred data, model authority, network behavior, persistence or category/ledger semantics must update the owning contract first.

## Frozen invariants

- Existing CSV/XLSX encoding, ZIP, formula, row and file limits remain Aura-owned.
- AI selects only Aura-generated candidate IDs. Unknown/missing/duplicate IDs fail closed.
- User-confirmed mapping gates deterministic Aura extraction of date, description, signed amount and type.
- Supported amount strategies start with `signed-negative-expense`, `signed-positive-expense`, `debit-credit`, `amount-direction`.
- Schema result is `resolved | ambiguous | unsupported`; correctness never depends on model self-confidence.
- Category resolution uses unambiguous normalized-description + type history first; Harnex only receives unresolved groups and supplied ephemeral category IDs.
- Harnex use cases are local, stateless, JSON-schema constrained, cancellable and cleanup-safe. Initial IDs: `aura-transaction-schema-inference`, `aura-transaction-category-classification`.
- Category batches are sequential and packed by advertised input budget.
- Harnex failure never blocks Review/manual import. Existing ledger fingerprint, duplicate warning, verified commit and undo remain canonical.

## Current checkpoint

- Aura integrated base through W9: `dev@4d816359470a0bff2d2397b567faa117ec1e4c89`.
- Harnex integrated fixture used by W9: `dev@d60c0ff9560d6eed225e4fd6e02e746f18625935`.
- Integrated Aura lanes: #9 W1, #10 W2, #11 W4, #12 W5, #15 W6, #19 W7, #20 W8, #21 W9. Harnex prerequisites are integrated through #560 and #563.
- W9 exact-head Repository health #84 (`34274853743`) passed on Aura `d0d0af84dd36361132709436fa2e6742602e30b7` against that Harnex fixture.
- Refresh heads/bases before readiness or release claims; material edits invalidate affected evidence.

## Risks

| Risk | Evidence required |
| --- | --- |
| Silent wrong schema | Multi-source goldens; assisted mapping remains editable and explicitly confirmed; unsafe silent mapping rate = 0. |
| Weak local model semantics | Separate real-model qualification; deterministic candidate validation remains authoritative. |
| Wrong taxonomy suggestion | Unknown IDs rejected; suggestions remain editable in Review. |
| Lifecycle/resource leak | Cancel/close/retry/reconnect plus two-APK evidence. |
| Cross-repo drift | Published Consumer SDK and exact Harnex source identity. |
| V2 regresses V1 | V1 regressions plus proof assistance is entered only for V2 `mapping-required`. |

## Execution DAG

States: `READY | ACTIVE | BLOCKED | DONE`.

| ID | State | Acceptance |
| --- | --- | --- |
| W0 Contract/privacy freeze | DONE | Feature, ADR and processing contract frozen. |
| W1 Multi-source corpus | DONE | 21 synthetic supported/ambiguous/rejected source shapes. |
| W2 Generic discovery/profiler | DONE | Bounded local sheet/header/column profiles and executable candidates. |
| W3 Harnex host capability | DONE | Aura identities + two stateless JSON_SCHEMA use cases; policy fails closed. |
| W4 Aura Consumer bridge | DONE | Published SDK behind typed Capacitor boundary with lifecycle/cancel cleanup. |
| W5 UX task/state contract | DONE | Mapping, unavailable, progress, ambiguity, partial failure, retry/manual and accessibility states. |
| W6 Manual vertical slice (G1) | DONE | Unknown file -> manual mapping -> deterministic extraction -> existing Review/commit; V1 unchanged. |
| W7 Schema inference | DONE | #19: candidate IDs only; resolved revalidated; invalid/ambiguous/unavailable fail closed. |
| W8 Category engine | DONE | #20: local history first; bounded sequential Harnex fallback; supplied IDs only; partial work reviewable. |
| W9 Cross-app/eval lane | DONE | #21 + Harnex #563: deterministic host/policy/schema/category/cancel/reconnect/restart two-APK coverage. |
| W10 Integrated UX (G2) | ACTIVE | Converge assistance into existing wizard/Review/verified commit and prove packaged WebView -> Capacitor -> Harnex -> Review/commit on exact-head automation. |
| W11 Hardening/docs | BLOCKED | Current privacy/security/testing/current-state docs; unavailable/offline/accessibility/limits/rollback/V1 compatibility. |
| W12 Integration preflight (G3) | BLOCKED | Fresh source identity + selector `auto` + all required deterministic gates + FULL_MEDIA. |
| W13 Release qualification | BLOCKED | Exact compatible candidates close physical/model/resource/accessibility/signer evidence. |

## W10 convergence

The W10 candidate extends existing owners only:

- `ImportWizardDialog` invokes schema assistance only for V2 `mapping-required`; V1 still goes directly from local validation to preparation and Review.
- Resolved Harnex schema output pre-populates the existing mapping editor but never auto-confirms it. `executeImportV2Mapping` runs only after explicit confirmation.
- Aura-owned deterministic extraction completes before category assistance.
- W8 category resolution runs local history first; returned categories are applied through existing `applyImportCategory` Review semantics.
- Partial success is preserved across Continue and Retry. Unresolved rows remain `Uncategorized`; unavailable/cancelled assistance never discards prepared rows or blocks Review.
- Reset/close aborts assistance and revision-gates stale async completion. Assistance never writes the ledger.
- `commitPreparedTransactionImport` remains the only V2 transaction write after Review/final confirmation; duplicate, fingerprint and undo semantics are unchanged.
- The W9 runner adds a packaged Aura WebView journey: synthetic V2 CSV -> real Capacitor/Consumer/Binder assistance -> explicit mapping confirmation -> category Review -> verified Aura commit.

## Validation / resume

W10 is central UI plus cross-app integration. Use selector `auto`; material browser UX requires `FULL_MEDIA`. Android/package/two-APK deterministic gates are `REMOTE_AUTOMATED` when equivalent local tooling is unavailable. Never delegate those gates to the user.

Physical ARM64/JNI/GGUF execution, production-model quality/latency, memory/thermal/OEM behavior, production signer topology and representative TalkBack/text scaling remain separate `REAL_ENVIRONMENT` release evidence.

Resume from live GitHub, not this text alone. Current base is `dev@4d816359470a0bff2d2397b567faa117ec1e4c89`; W0-W9 are integrated, W10 is active on `feat/import-v2-integrated-ux`, and W11-W13 remain downstream-blocked. W10 becomes DONE only after required exact-head deterministic evidence passes.
