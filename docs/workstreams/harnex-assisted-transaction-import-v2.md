# Harnex-assisted Transaction Import V2

Status: ACTIVE — W0-W12.1 integrated; W12.2 interactive raw interpretation in progress; W13 release qualification blocked on W12.2 integration.

## Goal and boundary

Aura should accept technically safe CSV/XLSX bank exports even when their structure was not anticipated by Aura's existing profiler. Aura owns technical/resource gates, the bounded raw-document representation, the declarative transformation-plan language, deterministic execution/provenance, Review and canonical commit. Authorized on-device Harnex may interpret bounded source-shaped content, propose a complete Aura-owned transformation plan and revise that proposal from structured user feedback.

A Harnex proposal is not authoritative. Aura must show a deterministic preview and ask the user whether the interpretation is correct. Full-file execution is allowed only after explicit confirmation of that exact proposal. Rejecting or editing a proposal invalidates its confirmation and starts a revision/manual-correction path.

Invariants: no cloud fallback; Harnex cannot write Aura storage; V1 deterministic fast path stays isolated; filename/account/auth/ledger data is excluded; no model-generated executable parser/code; source/plan/preview/feedback state is session-only; no row is silently invented or dropped; Review + verified commit remains the only canonical write path.

Durable owners: [`V2 spec`](../specs/harnex-assisted-transaction-import-v2.md), [`ADR 0009`](../../adr/0009-aura-interactive-harnex-import-interpretation.md), [`privacy record`](../04-privacy-gdpr/harnex-assisted-import-processing-record.md). ADR 0008 is superseded for the schema-understanding boundary.

## Integrated checkpoint before W12.2

- Diagnostics correction merged through PR #32; `dev@0e12462f7e386f0ccf0367f119fedcff235a18f5` has post-merge Repository Health run #180 green after one Android emulator/media-stack retry on unchanged exact HEAD.
- The diagnostics distinguish candidate/profile failure from Harnex/schema outcome without logging financial content.
- Existing V2 still constrains Harnex to Aura-generated candidate IDs and can therefore fail to represent source layouts such as a whole semicolon-delimited logical record contained in one quoted CSV cell.

## W12.2 interactive raw interpretation

### Observable outcome

Given a technically safe non-standard file, Aura preserves a bounded source-shaped view, asks Harnex to propose an Aura-owned declarative transformation plan, renders a deterministic preview, requires explicit user confirmation, and only then executes the plan over the full source. If the user says the interpretation is wrong, Aura captures structured feedback and requests a revised complete proposal; the revised proposal must be previewed and confirmed again.

### Canonical owners

- `src/data/import/`: technical gates and bounded raw-document reader.
- `src/domain/import/v2/`: transformation plan, validation, provenance, confirmation state and deterministic executor.
- `src/services/import/v2/`: Harnex request/response orchestration, feedback revision and exception repair.
- `src/components/import/`: preview/feedback/recovery UX.
- `src/platform/` + Android: unchanged Harnex transport/lifecycle boundary unless a use-case contract change requires native updates.

### Initial plan language

The first implementation supports only versioned Aura-owned primitives:

- visible/source sheet selection;
- normal grid records;
- delimited logical records contained in one source cell (`comma`, `semicolon`, tab or pipe);
- header row + first data row;
- Aura-owned date parsers;
- one or more description columns;
- signed amount, debit/credit and amount+direction strategies;
- deterministic row provenance and unresolved-row accounting.

No arbitrary regex, code, formulas or Harnex-authored executable logic.

### Feedback model

Global feedback areas: date, amount/sign, description, table selection, missing transactions, row interpretation and other. A global correction asks Harnex for a new complete plan. Row-specific corrections are separate and must not silently mutate the confirmed global plan.

Feedback is session-only and is not persistent learning.

## Execution DAG

States: `READY | ACTIVE | BLOCKED | DONE`.

| ID | State | Acceptance |
| --- | --- | --- |
| W0-W12 Implementation/integration | DONE | Prior candidate-based V2 implementation integrated. |
| W12.1 Diagnostics/schema-routing correction | DONE | Safe unknown schema reaches assistance/manual path; privacy-safe diagnostics integrated. |
| W12.2.1 Contract/docs/raw reader | ACTIVE | ADR/spec/privacy/workstream updated; bounded source-shaped reader and transformation-plan contract covered by deterministic tests. |
| W12.2.2 Plan inference + deterministic preview | READY | Harnex can propose only valid plan primitives; Aura produces provenance-bearing preview without full-file mutation. |
| W12.2.3 Interactive confirmation/feedback loop | READY | Explicit correct/wrong decision; feedback yields a new proposal/preview; prior confirmation invalidated. |
| W12.2.4 Full executor + unresolved row accounting | READY | Confirmed plan only; every candidate row resolved or explicitly unresolved; no silent drop/invention. |
| W12.2.5 Exception repair + category integration | READY | Bounded unresolved-row repair, category flow, cancellation and cleanup preserve existing invariants. |
| W12.2.6 Material UX + exact-head integration | READY | Browser/Android affected journeys pass with FULL_MEDIA and exact-head required automation. |
| W13.1-W13.6 Release qualification | BLOCKED | Resume only after W12.2 is integrated and automated evidence is current. |

## Acceptance fixture families

The deterministic/synthetic corpus will include at minimum:

- canonical V1 fast path;
- arbitrary/localized headers;
- quoted-row wrapper CSV (the current `Data Operazione;Causale;Uscite;Entrate` shape inside one quoted cell);
- no header;
- metadata/preamble before the table;
- debit/credit split;
- amount + direction column;
- European/US numeric conventions;
- ambiguous dates requiring feedback instead of silent guessing;
- split description columns;
- repeated headers/footer totals;
- multiple worksheets;
- one-column semi-structured records where supported by the declarative primitives;
- mostly regular data with isolated unresolved rows;
- non-financial/insufficient input returning unsupported rather than invented financial data.

Cross-cutting assertions: no hidden ledger mutation before final commit, no silent row drop, no invented amount/date, confirmed plan identity required for full execution, provenance for preview/output, Harnex failure leaves a safe recovery path, diagnostics/logs remain content-free.

## Validation plan

This is a material domain/service/UI boundary change. The selector decides the exact profile, but integration is expected to require at least STRONG validation and affected browser/Android `FULL_MEDIA` journeys. Android/Gradle gates are `REMOTE_AUTOMATED` when the local agent lacks the toolchain; they must not be delegated to the user.

W13 physical signer/GGUF/resource/OEM/TalkBack/privacy-authority evidence remains `REAL_ENVIRONMENT` and is deferred until W12.2 is integrated.

## Resume checkpoint

W12.2 started from `dev@0e12462f7e386f0ccf0367f119fedcff235a18f5` on branch `feature/harnex-interactive-raw-import`. First slice establishes ADR 0009, bounded raw-document/domain plan contracts and regression coverage for the quoted-row CSV shape. Next implementation step is replacing candidate-only schema inference with plan inference + deterministic preview, then wiring explicit feedback/revision in the wizard before full execution.
