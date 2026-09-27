# ADR 0009: Interactive Harnex Import Interpretation

- Status: Superseded for the canonical source-understanding flow by [ADR 0010](./0010-aura-deterministic-first-import-v2.md)
- Date: 2026-09-15
- Relates to: ADR 0002, ADR 0006, ADR 0008
- Supersedes: the candidate-selection-only schema-understanding boundary in ADR 0008. The no-cloud, local-first, user-review and verified-commit invariants remain in force.

## Context

ADR 0008 deliberately constrained Harnex to selecting among Aura-generated date/amount/description candidates. That boundary is safe, but it assumes Aura has already interpreted enough of the source structure to advertise a complete candidate space.

Real bank exports can violate that assumption while remaining technically safe to read. Examples include a whole logical record wrapped in one quoted CSV cell, localized or unknown headers, metadata before the table, split debit/credit columns, repeated headers, footer totals, multiple worksheets and other layouts Aura did not anticipate when its parser/profile heuristics were written.

The product requirement is broader: Aura should accept technically safe CSV/XLSX sources without requiring the user to reshape them first. Harnex should help interpret the source into Aura's canonical transaction model. The interaction must remain explainable and user-controlled: a model-proposed interpretation is shown as a preview and cannot become authoritative until the user explicitly confirms it or gives corrective feedback.

## Decision

Aura will move from **candidate selection** to **interactive declarative interpretation**.

The processing boundary becomes:

```text
user-selected CSV/XLSX
 -> Aura technical/resource safety gates
 -> bounded source-shaped document view
 -> local Harnex interpretation
 -> Aura-owned declarative transformation plan
 -> deterministic preview with source provenance
 -> explicit user confirmation OR structured feedback
 -> Harnex revision loop when feedback is provided
 -> confirmed plan
 -> deterministic full-file execution
 -> bounded exception repair for unresolved rows when needed
 -> category assistance/review
 -> existing verified Aura commit
```

### Aura ownership

Aura remains authoritative for:

- file/container/resource/security gates;
- the raw-document bounds exposed to Harnex;
- the allowed transformation-plan language;
- deterministic execution of a confirmed plan;
- source provenance and row accounting;
- duplicate/history/category-set authority;
- user confirmation/recovery UX;
- canonical transaction validation and verified ledger commit.

### Harnex ownership

Harnex remains authoritative for:

- caller authorization;
- use-case/model/preset/runtime policy;
- local Binder execution, scheduling, cancellation and resource lifecycle;
- semantic interpretation of bounded source content;
- proposing a complete declarative transformation plan;
- revising the proposal from structured user feedback;
- optional bounded repair/classification operations that remain JSON-schema constrained.

### Transformation plan, not model-generated code

Harnex may no longer be limited to selecting only Aura's precomputed candidate IDs, but it still may not return executable code, arbitrary regular expressions, scripts, formulas or ledger mutations.

The Harnex result is a versioned Aura-owned declarative plan. Initial primitives include:

- source sheet selection;
- grid records or a delimited logical record contained inside one source cell;
- header/data start rows;
- date column plus one Aura-owned date parser;
- one or more description columns;
- Aura-owned amount strategies such as signed amount, debit/credit and amount+direction;
- bounded row exceptions handled separately rather than silently dropped.

Aura validates the plan before preview/execution and rejects any unsupported primitive or out-of-range source reference.

### Raw-document boundary

"Raw" means **source-shaped content after technical safety parsing**, not unrestricted bytes or an unlimited workbook upload.

Aura may provide Harnex with a bounded session-only representation of source rows/cells, including content required to understand structure. This is intentionally earlier than the semantic profile used by ADR 0008. Filename/path, Firebase/account identity, credentials, cloud-backup content and the complete ledger remain excluded.

The default Harnex request remains bounded by Aura and Harnex capability limits. Large files are interpreted from representative source windows; additional windows may be requested only when necessary for validation/repair. The complete file is not sent as one unconstrained prompt.

### Mandatory interactive confirmation

A Harnex interpretation is a **proposal**, not an accepted mapping.

Aura must show a deterministic preview containing representative canonical rows before the plan is used for full-file execution. The user is offered two primary outcomes:

- **Correct**: Aura marks that exact proposal as confirmed and may execute it deterministically across the source.
- **Something is wrong**: Aura captures structured feedback (for example date, amount/sign, description, table selection, missing transactions or row interpretation) and asks Harnex for a revised complete proposal.

Every revised proposal creates a new preview and requires confirmation again. Editing or rejecting a proposal invalidates confirmation of the previous proposal.

No Harnex-derived structural interpretation becomes authoritative merely because the model returned `resolved`.

### Feedback retention

User feedback in this workflow is session-only correction data. It is not persistent training, merchant learning or a hidden rule store. Any future persistent learning requires a separate product/privacy decision and explicit user-facing control.

### Row exceptions

After a confirmed plan is executed, Aura must account for every candidate source row. A row that cannot be deterministically transformed is marked unresolved; it is never silently dropped or converted to fallback financial data.

If most rows succeed, Aura may send only bounded unresolved-row context to Harnex for exception repair. A row-level repair cannot silently rewrite the confirmed global plan. Global-structure feedback and row-specific corrections are separate concepts.

## Safety invariants

- no cloud inference fallback;
- Harnex cannot write Aura storage or the ledger;
- no model-generated executable parser/code;
- no transaction may be silently invented, dropped or mutated without source provenance;
- unresolved/ambiguous data stays unresolved until the user or deterministic validation resolves it;
- a proposed plan requires explicit user confirmation before full execution;
- category suggestions remain reviewable and limited to supplied categories;
- only the existing verified Aura commit writes canonical transactions;
- source/plan/preview/feedback state is session-only unless a later durable contract is approved;
- financial content and generated outputs are never intentionally logged.

## Alternatives rejected

- **Keep candidate-selection-only inference:** rejected because unfamiliar but readable source structures can be lost or constrained before Harnex can reason about them.
- **Ask Harnex to return final transactions directly:** rejected because it weakens deterministic row accounting, provenance and reproducibility and increases omission/invention risk.
- **Generate parser code or arbitrary regex from the model:** rejected because it creates an executable-code/security boundary and makes behavior difficult to constrain and validate.
- **Automatically accept a high-confidence model result:** rejected because financial interpretation must remain explicitly user-confirmed.
- **Send the entire unrestricted workbook to Harnex:** rejected because it is unnecessary for most interpretation tasks and weakens minimization/resource guarantees.

## Consequences

- the V2 schema-inference contract must evolve from candidate IDs to a versioned transformation-plan schema;
- Aura needs a bounded raw-document reader that preserves source shape without imposing semantic mapping;
- the wizard needs an explicit interpretation preview/feedback loop before full execution;
- diagnostics must remain content-free even though Harnex itself may receive bounded raw financial content locally;
- the privacy record and real-model quality corpus must be updated for the broader local Harnex content boundary;
- tests must cover both successful unusual formats and fail-closed ambiguity/row-accounting cases;
- release qualification for the prior W12 implementation is paused until this successor boundary is integrated and revalidated.
