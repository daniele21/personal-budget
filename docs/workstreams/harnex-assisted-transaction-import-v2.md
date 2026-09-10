# Harnex-assisted Transaction Import V2

Status: ACTIVE

## Goal

Import reasonably structured CSV/XLSX bank exports without fixed column names/order: Aura profiles locally, Harnex assists schema/category selection on-device, ambiguity stays reviewable, and only Aura's verified commit writes transactions.

## Boundary and non-goals

- Aura owns workflow, spreadsheet discovery, financial semantics, review, duplicates and ledger commit; Harnex owns authorization, use-case/model/runtime policy, Binder execution and lifecycle.
- Harnex is optional. Unavailable Harnex falls back to manual mapping; never to cloud AI.
- Out of scope: PDF/OCR, `.xls`/`.xlsm`, arbitrary parsing expressions, FX normalization, bank connectivity and financial advice.
- Never send a complete workbook/ledger to Harnex, persist Harnex/source provenance in `Transaction`, create categories silently or let Aura select Harnex models.
- Preserve the V1 `date,description,amount` fast path.

## Frozen contract owners

- feature contract: [`../specs/harnex-assisted-transaction-import-v2.md`](../specs/harnex-assisted-transaction-import-v2.md)
- trust/ownership: [`../../adr/0008-aura-harnex-assisted-import.md`](../../adr/0008-aura-harnex-assisted-import.md)
- privacy/data flow: [`../04-privacy-gdpr/harnex-assisted-import-processing-record.md`](../04-privacy-gdpr/harnex-assisted-import-processing-record.md)

Material changes to data fields, model authority, network behavior, persistence or ledger/category semantics update the owner before implementation.

## Invariants

- Existing CSV/XLSX encoding, resource, ZIP, formula and row/file bounds remain Aura-local.
- AI may select only Aura-generated candidate/category IDs. Unknown, missing or duplicate IDs fail closed.
- Confirmed mapping -> deterministic Aura extraction of date, description, signed amount and type; unsafe silent mapping blocks release.
- Initial amount strategies: `signed-negative-expense`, `signed-positive-expense`, `debit-credit`, `amount-direction`; descriptions may join bounded columns.
- Schema output is `resolved | ambiguous | unsupported`; correctness never depends on model confidence.
- Categories resolve conservative normalized-description + type history first, then only supplied ephemeral IDs or unresolved.
- Harnex use cases are local, stateless, JSON-schema constrained, cancellable, cleanup-safe and content-free in ordinary logs: `aura-transaction-schema-inference`, `aura-transaction-category-classification`.
- Category batches are sequential and packed by advertised input budget.
- Harnex failure never blocks manual import. Verified commit, fingerprint, duplicate and undo semantics remain canonical.

## Source checkpoint

- Aura W10 base: `dev@4d816359470a0bff2d2397b567faa117ec1e4c89`.
- Current Harnex repair candidate: `4ddfc170653e7c2564842d822bcb1016956884bc`, PR #565; previous fixture: `d60c0ff9560d6eed225e4fd6e02e746f18625935`.
- Integrated Aura: #9 W1, #10 W2, #11 W4, #12 W5, #15 W6, #19 W7, #20 W8, #21 W9 implementation; Harnex #560 W3.
- Aura run #85 (`34276168216`) is **not** valid W9 lifecycle evidence: Harnex hit Room main-thread access and Aura's shell runner masked AndroidJUnitRunner failure as PASS. Its independent web/build evidence is unaffected.
- Repair: Harnex moves the emulator shell command handler off main thread; Aura parses instrumentation terminal output fail-closed. Re-prove W9 before resuming W10 validation.
- W10 branch: `feat/import-v2-integrated-ux-w10`. Material edits invalidate older exact-head evidence.

## Material risks

| Risk | Level | Discriminating evidence |
| --- | --- | --- |
| Silent wrong schema | HIGH | Goldens; invalid/ambiguous results require editable review; unsafe-silent rate = 0. |
| Weak local model semantics | HIGH | Separate real-model qualification; deterministic CI never trusts self-confidence. |
| Wrong taxonomy | MEDIUM | Reject category IDs outside active Aura categories. |
| Lifecycle/resource leaks | HIGH | Cancel/close/retry/reconnect across Capacitor, Consumer SDK and two-APK automation. |
| Cross-repo drift | MEDIUM | Published SDK plus exact Harnex source identity. |
| V1 regression | MEDIUM | V1 fast path remains isolated and regression-tested. |

## Execution DAG

States: `READY | ACTIVE | BLOCKED | DONE`.

| ID | State | Depends | Acceptance |
| --- | --- | --- | --- |
| W0 Contract/privacy freeze | DONE | — | Spec, ADR and privacy contract frozen. |
| W1 Multi-source corpus | DONE | W0 | 21 synthetic supported/ambiguous/rejected source shapes. |
| W2 Generic discovery/profiler | DONE | W0 | Bounded local sheet/header/column profiling and executable candidates. |
| W3 Harnex host capability | DONE | W0 | Aura identities/use cases integrated; unauthorized/disabled/unready fail closed. |
| W4 Aura Consumer bridge | DONE | W0 | Published SDK lifecycle behind typed Capacitor boundary. |
| W5 UX task/state contract | DONE | W0 | Mapping, progress, recovery, cancellation and accessibility semantics implemented. |
| W6 Manual vertical slice G1 | DONE | W1,W2,W5 | Unknown source -> manual mapping -> deterministic extraction -> existing review/commit. |
| W7 Schema inference | DONE | W2,W3,W4,W6 | #19 bounded candidate selection; invalid output fails closed. |
| W8 Category engine | DONE | W3,W4,W6 | #20 history-first, bounded sequential batches, supplied-ID validation. |
| W9 Cross-app/eval lane | ACTIVE | W3,W4 | Repair false-positive evidence, then re-prove absent/auth/schema/category/cancel/reconnect on exact candidates. |
| W10 Integrated UX G2 | BLOCKED | W7,W8,W9 | Implementation exists; after W9, prove packaged discovery -> assistance -> deterministic extraction -> categories -> review -> verified commit. |
| W11 Hardening/docs | BLOCKED | W10 | Privacy/security/offline/accessibility/limits/rollback/V1 current and tested. |
| W12 Integration preflight G3 | BLOCKED | W11 | Fresh exact heads; selector-owned deterministic gates green; material UI FULL_MEDIA. |
| W13 Release qualification | BLOCKED | W12 | Physical local-model/resource/accessibility/authorization evidence. |

## W10 implementation state

- Resolved Harnex schema output pre-fills only Aura IDs and still requires explicit editable mapping confirmation.
- Ambiguous/unsupported/unauthorized/unavailable/cancelled assistance stays manual and cannot commit.
- Aura deterministic extraction runs before category assistance.
- Categories use local history first, then bounded Harnex suggestions; only active Aura IDs modify ephemeral review state.
- Partial/cancelled category work preserves safe completed suggestions and leaves unresolved rows reviewable.
- No suggestion provenance enters canonical `Transaction`; Review/verified commit remains unchanged.
- Browser/Harnex-absent and V1 paths remain first-class regressions.

## Validation

- W9 requires real Aura APK + real Harnex Host/Consumer on emulator. A PASS marker is valid only when AndroidJUnitRunner itself reports successful terminal status.
- W10/G2 additionally requires central packaged UI evidence and `FULL_MEDIA`; lower-level Binder assertions alone are insufficient.
- Real-model quality is separate from deterministic CI.
- Missing local Android tooling is `REMOTE_AUTOMATED`, never user-run work.
- Physical ARM64/GGUF, thermal/memory/OEM, Play signer topology and representative TalkBack/text scaling remain release `REAL_ENVIRONMENT` evidence.

## Executable now

1. Validate Harnex PR #565 exact candidate and Aura fail-closed runner through repository-owned automation.
2. If W9 passes truthfully, resume W10 packaged G2 on the same exact candidates.
3. Recover browser `FULL_MEDIA`; the current Playwright dependency-install hash mismatch is an environment/toolchain blocker, not substitute evidence.
4. Start W11 only after W10 G2 is green.

## Resume checkpoint

Aura base `dev@4d816359470a0bff2d2397b567faa117ec1e4c89`; W0-W8 DONE; W9 ACTIVE on evidence repair with Harnex `4ddfc170653e7c2564842d822bcb1016956884bc`; W10 implementation present but BLOCKED on truthful W9 evidence; W11-W13 downstream. Next discriminating action: exact-head cross-app automation.

Record failed hypotheses/evidence and deferred `REAL_ENVIRONMENT` obligations. Never reuse success from an older material HEAD.

## Durable destinations

Before deleting this completed plan, transfer settled truth to owning spec/ADR/privacy/security/testing/current-state/code documents.