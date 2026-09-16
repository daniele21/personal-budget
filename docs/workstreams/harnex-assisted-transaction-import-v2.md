# Harnex-assisted Transaction Import V2

Status: ACTIVE — W0-W12.1 integrated; W12.2 interactive source interpretation implemented through the user-confirmation/full-execution boundary and under integration validation; W13 release qualification remains blocked on W12.2 integration.

## Goal and boundary

Aura should accept technically safe CSV/XLSX bank exports even when their structure was not anticipated by Aura's existing profiler. Aura owns technical/resource gates, the bounded raw-document representation, the declarative transformation-plan language, deterministic execution/provenance, Review and canonical commit. Authorized on-device Harnex may interpret bounded source-shaped content, propose a complete Aura-owned transformation plan and revise that proposal from structured user feedback.

A Harnex proposal is not authoritative. Aura shows a deterministic preview and asks the user whether the interpretation is correct. Full-file execution is allowed only after explicit confirmation of that exact proposal. Rejecting a proposal starts a revision/manual-correction path and any revised proposal must be previewed and confirmed again.

Invariants: no cloud fallback; Harnex cannot write Aura storage; V1 deterministic fast path stays isolated; filename/account/auth/ledger data is excluded; no model-generated executable parser/code; source/plan/preview/feedback state is session-only; no row is silently invented or dropped; Review + verified commit remains the only canonical write path.

Durable owners: [`V2 spec`](../specs/harnex-assisted-transaction-import-v2.md), [`ADR 0009`](../../adr/0009-aura-interactive-harnex-import-interpretation.md), [`privacy record`](../04-privacy-gdpr/harnex-assisted-import-processing-record.md). ADR 0008 is superseded for the schema-understanding boundary.

## Integrated checkpoint before W12.2

- Diagnostics correction merged through PR #32; `dev@0e12462f7e386f0ccf0367f119fedcff235a18f5` has post-merge Repository Health run #180 green after one Android emulator/media-stack retry on unchanged exact HEAD.
- The diagnostics distinguish candidate/profile failure from Harnex/schema outcome without logging financial content.
- Existing integrated V2 still constrains Harnex to Aura-generated candidate IDs and can therefore fail to represent source layouts such as a whole semicolon-delimited logical record contained in one quoted CSV cell.

## W12.2 interactive source interpretation

### Observable outcome

Given a technically safe non-standard file, Aura preserves a bounded source-shaped view, asks Harnex to propose an Aura-owned declarative transformation plan, renders a deterministic preview, requires explicit user confirmation, and only then executes the plan over a fresh full local read of the source. If the user says the interpretation is wrong, Aura sends a closed structured feedback area plus the previous proposal to Harnex; the replacement proposal must be previewed and confirmed again.

If full execution finds rows that cannot be transformed safely, those source rows remain explicit and block preparation/commit. They are never dropped. W12.2.5 will add bounded row-specific repair without allowing a row repair to silently replace the confirmed global plan.

### Canonical owners

- `src/data/import/`: technical gates, sampled source-shaped reader and fresh full local execution read.
- `src/domain/import/v2/`: transformation plan, validation, provenance, confirmation state and deterministic executor.
- `src/services/import/v2/`: Harnex plan inference/revision and confirmed-plan execution orchestration.
- `src/components/import/`: preview, explicit Correct/Wrong feedback gate, recovery and manual fallback UX.
- `src/platform/` + Android: unchanged Harnex transport/lifecycle boundary unless a use-case contract change requires native updates.

### Current implementation checkpoint

The active branch now contains the first end-to-end interactive path:

- V2 routing keeps the legacy semantic profile for manual recovery and also builds a bounded raw/source-shaped document when technical gates permit it;
- Harnex receives only visible bounded source windows and returns a JSON-schema-constrained Aura transformation plan;
- Aura validates the plan and deterministically builds a provenance-bearing preview;
- the wizard adds a mandatory `Check interpretation` step with `Yes, this is correct` and `Something is wrong` outcomes;
- structured feedback (`date`, `amount`, `description`, `table`, `missing-transactions`, `row-interpretation`, `other`) requests a complete replacement proposal and therefore a second confirmation gate;
- confirmation creates a confirmed interpretation and only then permits a fresh full local source read plus deterministic execution;
- unresolved full-file rows are surfaced explicitly and block transaction preparation/commit;
- Harnex unavailable/unauthorized/unsupported paths retain the existing manual column-mapping recovery;
- category assistance and verified Review/commit remain downstream of successful deterministic execution.

The current plan contract deliberately makes Aura own description joining semantics. Harnex selects description source columns but does not select arbitrary separators or executable formatting logic.

### Initial plan language

The first implementation supports only versioned Aura-owned primitives:

- visible/source sheet selection;
- normal grid records;
- delimited logical records contained in one source cell (`comma`, `semicolon`, tab or pipe);
- header row + first data row;
- Aura-owned date parsers;
- one or more description source columns, joined by Aura-owned deterministic semantics;
- signed amount, debit/credit and amount+direction strategies;
- deterministic row provenance and unresolved-row accounting.

No arbitrary regex, code, formulas or Harnex-authored executable logic.

### Feedback model

Global feedback areas: date, amount/sign, description, table selection, missing transactions, row interpretation and other. A global correction asks Harnex for a new complete plan. Row-specific repair remains a separate W12.2.5 concern and must not silently mutate the confirmed global plan.

Feedback is session-only and is not persistent learning.

## Execution DAG

States: `READY | ACTIVE | BLOCKED | DONE`.

| ID | State | Acceptance |
| --- | --- | --- |
| W0-W12 Implementation/integration | DONE | Prior candidate-based V2 implementation integrated. |
| W12.1 Diagnostics/schema-routing correction | DONE | Safe unknown schema reaches assistance/manual path; privacy-safe diagnostics integrated. |
| W12.2.1 Contract/docs/raw reader | ACTIVE | ADR/spec/privacy/workstream updated; bounded source-shaped reader and transformation-plan contract pass exact-head deterministic tests. |
| W12.2.2 Plan inference + deterministic preview | ACTIVE | Harnex can propose only valid plan primitives; Aura produces provenance-bearing preview without full-file mutation; exact-head tests pass. |
| W12.2.3 Interactive confirmation/feedback loop | ACTIVE | Wizard requires explicit correct/wrong decision; feedback yields a new proposal/preview; prior proposal is never executed after rejection; material UX evidence passes. |
| W12.2.4 Full executor + unresolved row accounting | ACTIVE | Confirmed plan only; every candidate row is resolved or explicitly unresolved; no silent drop/invention; exact-head tests pass. |
| W12.2.5 Exception repair + category integration | READY | Add bounded row-scoped repair for unresolved rows without mutating the confirmed global plan; category/cancellation/cleanup invariants remain intact. |
| W12.2.6 Material UX + exact-head integration | READY | Browser/Android affected journeys pass with FULL_MEDIA and all selector-required exact-head automation. |
| W13.1-W13.6 Release qualification | BLOCKED | Resume only after W12.2 is integrated and automated evidence is current. |

## Acceptance fixture families

The deterministic/synthetic corpus includes or must include at minimum:

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

Cross-cutting assertions: no hidden ledger mutation before final commit, no silent row drop, no invented amount/date, confirmed proposal identity required before full execution, provenance for preview/output, Harnex failure leaves a safe recovery path, diagnostics/logs remain content-free.

## Validation plan

This is a material domain/service/UI boundary change. The selector decides the exact profile, but integration is expected to require at least STRONG validation and affected browser/Android `FULL_MEDIA` journeys. Android/Gradle gates are `REMOTE_AUTOMATED` when the local agent lacks the toolchain; they must not be delegated to the user.

A failed deterministic gate blocks readiness and is diagnosed before further feature expansion. Evidence from a material predecessor HEAD is not reused after code/docs changes.

W13 physical signer/GGUF/resource/OEM/TalkBack/privacy-authority evidence remains `REAL_ENVIRONMENT` and is deferred until W12.2 is integrated.

## Resume checkpoint

W12.2 started from `dev@0e12462f7e386f0ccf0367f119fedcff235a18f5` on branch `feature/harnex-interactive-raw-import` / draft PR #33. The raw-document contract, plan inference, deterministic preview, explicit feedback/confirmation UI and confirmed full-file executor are now wired into the wizard and are under exact-head integration validation. The next functional increment after deterministic gates are green is W12.2.5 bounded unresolved-row repair, followed by W12.2.6 material browser/Android integration evidence. W13 remains blocked until W12.2 is integrated.
