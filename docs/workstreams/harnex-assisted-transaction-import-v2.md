# Harnex-assisted Transaction Import V2

Status: ACTIVE — W0-W12.1 integrated; W12.2 is implemented through bounded unresolved-row repair and is under exact-head integration validation; W13 remains blocked until W12.2 is integrated.

Canonical contracts: [`V2 spec`](../specs/harnex-assisted-transaction-import-v2.md), [`ADR 0009`](../../adr/0009-aura-interactive-harnex-import-interpretation.md), [`privacy record`](../04-privacy-gdpr/harnex-assisted-import-processing-record.md). ADR 0008 is superseded for the schema-understanding boundary.

## Goal and invariants

Aura accepts technically safe CSV/XLSX exports whose semantic structure is not known in advance. Aura owns safety/resource gates, bounded raw-document representation, the declarative transformation language, deterministic execution/provenance, Review and canonical commit. Authorized on-device Harnex may interpret bounded source content and propose only Aura-owned primitives.

A proposal has no authority until Aura renders a deterministic preview and the user explicitly confirms that exact proposal. Rejection or revision invalidates confirmation and requires a new preview/confirmation. After confirmed full execution, every candidate row is resolved or explicit unresolved; no row is silently invented or dropped.

For a small unresolved set, Aura may attempt bounded row repair. The confirmed sheet/layout stay immutable; Harnex may return only row-local parser/column/amount-strategy references, never canonical financial values. Aura deterministically re-executes each accepted repair. Any remaining unresolved row keeps preparation/commit blocked; `global-plan-wrong` returns to global interpretation feedback.

Cross-cutting invariants: no cloud fallback; no Harnex storage write; no model-generated executable parsing code; source/plan/preview/feedback/repair state is session-only; diagnostics are content-free; V1 remains the deterministic fast path; verified Review/commit remains the only ledger writer.

## Current implementation

The active branch now contains the complete W12.2 functional path:

- bounded source-shaped CSV/XLSX read plus fresh full local execution read;
- JSON-schema-constrained Harnex transformation-plan inference from visible bounded source windows;
- Aura validation and deterministic provenance-bearing preview;
- mandatory `Check interpretation` with `Yes, this is correct` / `Something is wrong`;
- structured feedback requesting a complete replacement proposal and second confirmation gate;
- full-file execution only for the exact confirmed proposal;
- explicit unresolved-row accounting with no partial preparation/commit;
- bounded repair for at most eight unresolved rows, one Harnex generation per row, using only confirmed header + target row context;
- repair output limited to Aura-owned semantic source references; deterministic Aura re-execution decides acceptance;
- `global-plan-wrong`, invalid repair, Harnex unavailability and residual unresolved rows remain blocking with global revision/manual recovery;
- category assistance and verified Review/commit remain downstream and unchanged.

Row repair reuses `aura-transaction-schema-inference`; it does not add a new Binder/use-case policy surface.

## Execution DAG

States: `READY | ACTIVE | BLOCKED | DONE`.

| ID | State | Acceptance |
| --- | --- | --- |
| W0-W12 prior implementation | DONE | Candidate-based V2 baseline integrated. |
| W12.1 diagnostics/schema-routing correction | DONE | Unknown safe schema reaches assistance/manual path; content-free diagnostics integrated. |
| W12.2.1 contract/docs/raw reader | ACTIVE | Bounded source-shaped reader and transformation-plan contract pass current exact-head deterministic gates. |
| W12.2.2 inference + preview | ACTIVE | Only valid plan primitives accepted; deterministic provenance preview passes current exact-head tests. |
| W12.2.3 confirmation/feedback | ACTIVE | Explicit correct/wrong gate and revised-proposal reconfirmation pass current exact-head material UX evidence. |
| W12.2.4 full executor/accounting | ACTIVE | Confirmed-plan-only execution; every candidate row resolved or explicit unresolved. |
| W12.2.5 exception repair + category integration | ACTIVE | Bounded row repair cannot mutate global layout or author values; category/cancel/cleanup invariants pass current exact-head automation. |
| W12.2.6 exact-head integration | ACTIVE | Selector-required browser/Android `FULL_MEDIA` and all automated gates pass on final W12.2 HEAD. |
| W13 release qualification | BLOCKED | Resume only after W12.2 integration. |

## Validation and evidence

This is a material domain/service/UI boundary. The selector owns validation depth; Android/Gradle gates are `REMOTE_AUTOMATED` when the local agent lacks the toolchain and are never delegated to the user.

Repository Health #222 proved predecessor HEAD `388cb78eace833c6c4457c29ab7c3eb89d09fb38`, including the packaged Android quoted-CSV journey through Harnex preview, explicit confirmation and deterministic full execution. W12.2.5 changes the unresolved-row branch, so #222 is historical evidence only; final readiness requires current exact-head automation.

Required fixture assertions include: quoted-row source, invalid/unknown plan output, rejection/reconfirmation, explicit unresolved rows, successful deterministic row repair, repair attempts that smuggle financial values, `global-plan-wrong`, Harnex unavailable/cancelled, no silent ledger mutation and content-free diagnostics.

W13 physical signer/GGUF/resource/OEM/TalkBack/privacy-authority evidence remains `REAL_ENVIRONMENT` and deferred until W12.2 is integrated.

## Resume checkpoint

W12.2 started from `dev@0e12462f7e386f0ccf0367f119fedcff235a18f5` on `feature/harnex-interactive-raw-import` / draft PR #33. Functional implementation through bounded row repair is complete. Immediate next action: current exact-head Repository Health, then full-diff/base/readiness review and PR publication only if every required deterministic gate is green. W13 stays blocked until integration.
