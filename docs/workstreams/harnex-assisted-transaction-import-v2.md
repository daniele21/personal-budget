# Harnex-assisted Transaction Import V2

Status: ACTIVE — W0-W12.1 integrated; W12.2 interactive source interpretation is implemented through bounded unresolved-row repair and is under exact-head integration validation; W13 release qualification remains blocked until W12.2 is integrated.

## Goal and boundary

Aura should accept technically safe CSV/XLSX bank exports even when their structure was not anticipated by Aura's existing profiler. Aura owns technical/resource gates, the bounded raw-document representation, the declarative transformation-plan language, deterministic execution/provenance, Review and canonical commit. Authorized on-device Harnex may interpret bounded source-shaped content, propose a complete Aura-owned transformation plan and revise that proposal from structured user feedback.

A Harnex proposal is not authoritative. Aura shows a deterministic preview and asks the user whether the interpretation is correct. Full-file execution is allowed only after explicit confirmation of that exact proposal. Rejecting a proposal starts a revision/manual-correction path and any revised proposal must be previewed and confirmed again.

If a confirmed global plan resolves most of the file but leaves a small bounded set of rows unresolved, Aura may ask Harnex for row-scoped declarative repair. The confirmed sheet/layout remain immutable; Harnex cannot return transaction values. Aura re-executes any accepted row repair deterministically and keeps the import blocked if even one candidate row remains unresolved.

Invariants: no cloud fallback; Harnex cannot write Aura storage; V1 deterministic fast path stays isolated; filename/account/auth/ledger data is excluded; no model-generated executable parser/code; source/plan/preview/feedback/repair state is session-only; no row is silently invented or dropped; Review + verified commit remains the only canonical write path.

Durable owners: [`V2 spec`](../specs/harnex-assisted-transaction-import-v2.md), [`ADR 0009`](../../adr/0009-aura-interactive-harnex-import-interpretation.md), [`privacy record`](../04-privacy-gdpr/harnex-assisted-import-processing-record.md). ADR 0008 is superseded for the schema-understanding boundary.

## Integrated checkpoint before W12.2

- Diagnostics correction merged through PR #32; `dev@0e12462f7e386f0ccf0367f119fedcff235a18f5` has post-merge Repository Health run #180 green after one Android emulator/media-stack retry on unchanged exact HEAD.
- The diagnostics distinguish candidate/profile failure from Harnex/schema outcome without logging financial content.
- Existing integrated V2 still constrains Harnex to Aura-generated candidate IDs and can therefore fail to represent source layouts such as a whole semicolon-delimited logical record contained in one quoted CSV cell.

## W12.2 interactive source interpretation

### Observable outcome

Given a technically safe non-standard file, Aura preserves a bounded source-shaped view, asks Harnex to propose an Aura-owned declarative transformation plan, renders a deterministic preview, requires explicit user confirmation, and only then executes the plan over a fresh full local read of the source. If the user says the interpretation is wrong, Aura sends a closed structured feedback area plus the previous proposal to Harnex; the replacement proposal must be previewed and confirmed again.

After confirmed full-file execution, every candidate row is either resolved or explicitly unresolved. When the unresolved set is small, Aura may attempt bounded row repair before giving up: only the confirmed header plus one target row is supplied per repair request, source cells are re-bounded to Harnex capability limits, and at most eight rows are eligible in one import attempt. A repair response can only choose Aura-owned date parser/description-column/amount primitives for that row. It cannot replace the confirmed sheet/layout or author date/description/amount values. Aura deterministically re-executes the target source row; invalid, unsafe or still-ambiguous repairs remain unresolved. `global-plan-wrong` returns the user to global interpretation feedback and therefore requires a new proposal, preview and confirmation.

### Canonical owners

- `src/data/import/`: technical gates, sampled source-shaped reader and fresh full local execution read.
- `src/domain/import/v2/`: transformation plan, validation, provenance, confirmation state and deterministic executor.
- `src/services/import/v2/`: Harnex plan inference/revision, confirmed-plan execution orchestration, bounded row repair and category resolution.
- `src/components/import/`: preview, explicit Correct/Wrong feedback gate, repair/recovery and manual fallback UX.
- `src/platform/` + Android: unchanged Harnex transport/lifecycle boundary; row repair reuses the existing schema-inference use case rather than adding a new native policy surface.

### Current implementation checkpoint

The active branch contains the end-to-end interactive path through bounded exception repair:

- V2 routing keeps the legacy semantic profile for manual recovery and also builds a bounded raw/source-shaped document when technical gates permit it;
- Harnex receives only visible bounded source windows and returns a JSON-schema-constrained Aura transformation plan;
- Aura validates the plan and deterministically builds a provenance-bearing preview;
- the wizard adds a mandatory `Check interpretation` step with `Yes, this is correct` and `Something is wrong` outcomes;
- structured feedback (`date`, `amount`, `description`, `table`, `missing-transactions`, `row-interpretation`, `other`) requests a complete replacement proposal and therefore a second confirmation gate;
- confirmation creates a confirmed interpretation and only then permits a fresh full local source read plus deterministic execution;
- unresolved full-file rows remain explicit and block transaction preparation/commit;
- up to eight unresolved rows may enter bounded Harnex repair, one row at a time, using only the confirmed header/target-row context and the existing `aura-transaction-schema-inference` use case;
- repair output is closed to source references plus Aura-owned parsers/amount strategies; the model cannot return canonical financial values, change sheet/layout, or mutate the confirmed global plan;
- every repaired row is accepted only after Aura deterministic extraction/validation; partial/failed repair keeps the entire import blocked;
- a row repair that reports the global structure is wrong returns to the global feedback/new-preview/new-confirmation path;
- Harnex unavailable/unauthorized/unsupported paths retain safe manual/revision recovery;
- category assistance and verified Review/commit remain downstream of successful deterministic execution/repair.

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

### Feedback and repair model

Global feedback areas: date, amount/sign, description, table selection, missing transactions, row interpretation and other. A global correction asks Harnex for a new complete plan.

Row repair is intentionally narrower and occurs only after the exact global proposal was confirmed and deterministic full execution identified explicit unresolved source rows. It does not constitute a new global proposal and cannot change sheet or record layout. The response has three safe outcomes: a constrained row semantic repair, `unresolved`, or `global-plan-wrong`. The last outcome invalidates the repair path and returns to global feedback rather than silently rewriting the confirmed plan.

Feedback and repair context are session-only and are not persistent learning.

## Execution DAG

States: `READY | ACTIVE | BLOCKED | DONE`.

| ID | State | Acceptance |
| --- | --- | --- |
| W0-W12 Implementation/integration | DONE | Prior candidate-based V2 implementation integrated. |
| W12.1 Diagnostics/schema-routing correction | DONE | Safe unknown schema reaches assistance/manual path; privacy-safe diagnostics integrated. |
| W12.2.1 Contract/docs/raw reader | ACTIVE | ADR/spec/privacy/workstream updated; bounded source-shaped reader and transformation-plan contract pass current exact-head deterministic tests. |
| W12.2.2 Plan inference + deterministic preview | ACTIVE | Harnex can propose only valid plan primitives; Aura produces provenance-bearing preview without full-file mutation; current exact-head tests pass. |
| W12.2.3 Interactive confirmation/feedback loop | ACTIVE | Wizard requires explicit correct/wrong decision; feedback yields a new proposal/preview; prior proposal is never executed after rejection; material UX evidence passes on current exact HEAD. |
| W12.2.4 Full executor + unresolved row accounting | ACTIVE | Confirmed plan only; every candidate row is resolved or explicitly unresolved; no silent drop/invention; current exact-head tests pass. |
| W12.2.5 Exception repair + category integration | ACTIVE | Bounded row-scoped repair is implemented without mutating the confirmed global plan or authoring financial values; category/cancellation/cleanup invariants require current exact-head automated evidence. |
| W12.2.6 Material UX + exact-head integration | ACTIVE | Browser/Android affected journeys pass with FULL_MEDIA and all selector-required exact-head automation on the final W12.2 head. |
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
- mostly regular data with isolated unresolved rows that can be deterministically repaired from row-local source references;
- unresolved rows whose safe outcome remains blocking;
- row-repair output that attempts to smuggle financial values and therefore fails closed;
- row repair that identifies a global-plan problem and therefore requires a new global proposal;
- non-financial/insufficient input returning unsupported rather than invented financial data.

Cross-cutting assertions: no hidden ledger mutation before final commit, no silent row drop, no invented amount/date, confirmed proposal identity required before full execution, provenance for preview/output, Harnex failure leaves a safe recovery path, diagnostics/logs remain content-free.

## Validation plan

This is a material domain/service/UI boundary change. The selector decides the exact profile, but integration is expected to require at least STRONG validation and affected browser/Android `FULL_MEDIA` journeys. Android/Gradle gates are `REMOTE_AUTOMATED` when the local agent lacks the toolchain; they must not be delegated to the user.

Repository Health #222 proved the predecessor exact head `388cb78eace833c6c4457c29ab7c3eb89d09fb38`, including the packaged Android quoted-CSV path through Harnex preview, explicit confirmation and deterministic execution. W12.2.5 materially changes the unresolved-row branch after that checkpoint, so #222 is retained as historical evidence only; current exact-head automated validation is required before publication readiness.

A failed deterministic gate blocks readiness and is diagnosed before further feature expansion. Evidence from a material predecessor HEAD is not reused after code/docs changes.

W13 physical signer/GGUF/resource/OEM/TalkBack/privacy-authority evidence remains `REAL_ENVIRONMENT` and is deferred until W12.2 is integrated.

## Resume checkpoint

W12.2 started from `dev@0e12462f7e386f0ccf0367f119fedcff235a18f5` on branch `feature/harnex-interactive-raw-import` / draft PR #33. The raw-document contract, plan inference, deterministic preview, explicit feedback/confirmation UI, confirmed full-file executor and bounded unresolved-row repair are now wired into the wizard. The immediate next action is final exact-head automated integration validation and full-diff/readiness review. W13 remains blocked until W12.2 is integrated.
