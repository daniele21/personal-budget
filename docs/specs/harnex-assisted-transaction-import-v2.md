# Harnex-assisted Transaction Import V2

Status: **W12.2 interactive source interpretation is integrated through explicit user confirmation, deterministic full-file execution and bounded unresolved-row repair. W13 release qualification is now active; promotion remains blocked until its applicable real-environment and privacy-owner gates are complete.**

Active delivery tracker: [`../workstreams/harnex-assisted-transaction-import-v2.md`](../workstreams/harnex-assisted-transaction-import-v2.md).

Durable decision: [`../../adr/0009-aura-interactive-harnex-import-interpretation.md`](../../adr/0009-aura-interactive-harnex-import-interpretation.md). ADR 0009 supersedes the candidate-selection-only schema boundary from ADR 0008.

## Purpose

Aura accepts technically safe CSV/XLSX bank exports without requiring the user to reshape them to a known template. Aura preserves a bounded source-shaped view, uses authorized on-device Harnex to propose how that source maps to Aura transactions, executes only Aura-owned declarative transformation primitives, shows a deterministic preview, asks the user whether the interpretation is correct, and only after explicit confirmation executes the plan across a fresh full local read of the source.

If the user says the Harnex result is wrong, Aura captures structured feedback and requests a revised complete proposal. Every revised proposal gets a new preview and requires confirmation again.

If the confirmed global plan resolves most rows but leaves a small bounded exception set, Aura may ask Harnex for row-scoped declarative repair. Harnex still does not author transaction values: Aura re-executes each accepted row repair deterministically against the original source row.

V1 remains the deterministic canonical fast path when a source already matches `date,description,amount`.

## User promise

- Technically safe files are not rejected merely because Aura has never seen their schema before.
- Harnex runs only through the explicitly authorized on-device Android Consumer boundary; there is no cloud fallback.
- Harnex may interpret bounded source content, but it cannot write Aura storage, create transactions, invent categories or return executable parser code.
- Aura shows what Harnex understood before full-file execution.
- A Harnex proposal is never silently accepted: the user explicitly confirms it or reports what is wrong.
- A rejected proposal loses authority; a revised proposal must be previewed and confirmed again.
- Every candidate source row is either deterministically resolved or explicitly unresolved; rows are never silently dropped.
- Row repair cannot mutate the confirmed global sheet/layout or return date/description/amount values; it can only select Aura-owned semantic primitives for a specific unresolved source row.
- Final transaction Review + verified commit remains the only canonical ledger write.

## Scope

### In scope

- `.csv` and `.xlsx` within existing file/resource/security limits;
- arbitrary/localized headers;
- metadata/preamble before a table;
- selecting the relevant worksheet/table;
- ordinary grid records;
- a delimited logical record contained in one source cell, including the quoted-row CSV shape;
- one date field using Aura-owned date parsers;
- one or more description source fields, joined with Aura-owned deterministic semantics;
- signed amount, debit/credit and amount+direction strategies;
- deterministic preview with source-row/column provenance;
- explicit correct/wrong user feedback after Harnex interpretation;
- structured feedback refinement loop;
- unresolved-row accounting and bounded exception repair;
- optional category suggestions from the user's existing taxonomy;
- session-only interpretation/repair state;
- existing duplicate warning, Review, verified commit and undo semantics.

### Out of scope

- `.xls`, `.xlsm`, PDF, images or OCR;
- cloud inference fallback;
- model-generated code, scripts, arbitrary regex or spreadsheet formulas;
- model-authoritative ledger mutation or model-authored canonical financial values;
- FX conversion or automatic mixed-currency normalization in this slice;
- bank connectivity/Open Banking;
- automatic category creation/rename/delete;
- persistent learning from user feedback;
- persisting filename/source content, Harnex prompt/output/model/provider metadata or interpretation provenance in canonical `Transaction`.

## Processing stages

```text
selected file
  -> archive/legacy routing + technical/resource safety gates
  -> V1 canonical fast path when valid
  -> otherwise bounded source-shaped document read
  -> Harnex transformation-plan proposal
  -> Aura validates plan primitives/source references
  -> deterministic representative preview + provenance
  -> user decision: Correct | Something is wrong
       Correct -> exact proposal becomes confirmed
       Wrong   -> structured feedback -> new Harnex proposal -> new preview -> confirm again
  -> confirmed-plan deterministic full-file execution
  -> every candidate row resolved or explicitly unresolved
  -> bounded Harnex exception repair for a small unresolved set
       repair -> Aura deterministic row re-execution
       unresolved -> keep row blocking
       global-plan-wrong -> return to global feedback/new preview/new confirmation
  -> local duplicate/history/category resolution
  -> optional Harnex category batches
  -> Review
  -> existing verified transaction-only commit
```

The outer safety gates answer whether Aura can read the source safely. Harnex answers how the readable source should be interpreted. Those are separate decisions.

## Bounded raw-document contract

"Raw" means source-shaped rows/cells after technical/container safety handling, before Aura assigns financial semantics. It is not an unrestricted byte dump.

Conceptually:

```ts
interface ImportV2RawDocument {
  contractVersion: 1;
  sourceKind: 'csv' | 'xlsx';
  sheets: ImportV2RawSheet[];
}

interface ImportV2RawSheet {
  id: string;
  name: string;
  state: 'visible' | 'hidden' | 'veryHidden';
  rows: ImportV2RawRow[];
  totalNonEmptyRows: number;
  samplesTruncated: boolean;
}

interface ImportV2RawRow {
  rowNumber: number;
  cells: ImportV2RawCell[];
  mergedColumnIndexes?: number[];
}
```

The reader preserves source shape instead of forcing a semantic table first. For example, this valid but unusual CSV:

```csv
"Data Operazione;Causale;Uscite;Entrate"
"12/09/2026;SUPERMERCATO;43,20;"
"13/09/2026;STIPENDIO;;2100,00"
```

may reach interpretation as one source cell per row containing the semicolon-delimited logical record. It is not rejected merely because a conventional CSV parser sees one column.

Bounds remain authoritative. The sampled Harnex representation caps worksheets, logical columns, retained source rows and cell code points. Full execution does not reuse that truncated sample: after confirmation Aura re-reads the already selected file locally, within the authoritative file/row/column/resource limits, and applies the confirmed plan without sending the whole source to Harnex.

The raw-document reader does not decide what date, amount, description, header or table means.

## Transformation-plan contract

Harnex returns a versioned Aura-owned declarative plan. It may choose among allowed primitives and source coordinates; it may not return code.

Initial shape:

```ts
interface ImportV2TransformationPlan {
  contractVersion: 1;
  sheetId: string;
  layout:
    | { kind: 'grid'; headerRowNumber: number; firstDataRowNumber: number }
    | {
        kind: 'delimited-cell';
        sourceColumnIndex: number;
        delimiter: ',' | ';' | '\t' | '|';
        stripOuterQuotes: boolean;
        headerRowNumber: number;
        firstDataRowNumber: number;
      };
  date: { columnIndex: number; parser: AuraDateParserId };
  description: { columnIndexes: number[] };
  amount: AuraAmountPlan;
}
```

Initial amount primitives:

```ts
type AuraAmountPlan =
  | { strategy: 'signed-negative-expense'; columnIndex: number }
  | { strategy: 'signed-positive-expense'; columnIndex: number }
  | { strategy: 'debit-credit'; debitColumnIndex: number; creditColumnIndex: number }
  | {
      strategy: 'amount-direction';
      amountColumnIndex: number;
      directionColumnIndex: number;
      directionMapId: 'debit-credit-v1';
    };
```

Aura rejects unknown sheets, invalid row ranges, out-of-range column references, duplicate description references, conflicting amount columns, unsupported parser IDs and any schema output outside the closed contract.

Harnex selects description source columns only. Aura owns the canonical joining/normalization behavior so the model cannot introduce arbitrary formatting logic through the plan.

Future primitives require an explicit contract change; Harnex cannot smuggle new execution semantics through free text.

## Preview and provenance

Before full-file execution Aura applies the proposed plan only to the bounded source representation and builds a representative preview. Preview rows include canonical values plus source provenance:

```ts
interface ImportV2PreviewRow {
  date: string;
  description: string;
  signedAmountMinor: number;
  type: 'expense' | 'income';
  provenance: {
    sourceRowNumber: number;
    dateColumnIndex: number;
    descriptionColumnIndexes: number[];
    amountColumnIndexes: number[];
  };
}
```

The preview is the user-facing explanation of what Harnex understood. It is generated by Aura's deterministic executor from the proposed plan; it is not a second model-authored transaction list.

## Mandatory user confirmation and feedback loop

A model proposal has no authority by itself.

After the preview Aura asks:

- **Correct** — confirm the exact proposal and allow deterministic full-file execution;
- **Something is wrong** — do not execute the proposal across the full file; collect structured feedback and request a revision.

Initial feedback areas:

- date/date format;
- amount/sign/entrata-uscita semantics;
- description fields;
- wrong worksheet/table/header region;
- missing transactions;
- isolated row interpretation;
- other/general restart.

When feedback is submitted, Aura sends the previous proposal identity/plan plus only the bounded source context needed for revision. Harnex returns a complete replacement proposal, not an imperative patch. Aura validates it, rebuilds the preview and asks again.

A previous proposal cannot be executed after the user rejects it. Only a newly confirmed current proposal may enter full execution.

Feedback is session-only. Aura does not silently learn a bank format, merchant rule or category preference across imports in this slice.

## Deterministic full-file execution

Only a `ConfirmedImportV2Interpretation` may enter full execution. Aura performs a fresh local read of the user-selected source after confirmation so sampled Harnex bounds never become a silent row-drop boundary.

Execution invariants:

- every candidate source row is accounted for;
- no Harnex-generated value can bypass Aura parsing/validation;
- no date/amount/description is silently invented;
- no row is silently dropped because it does not fit the global plan;
- output remains subject to existing canonical validation, duplicate detection and Review;
- ledger mutation remains impossible before the verified commit stage.

The full executor returns resolved rows and explicit unresolved source-row numbers. Any unresolved/blocking result prevents transaction preparation and commit until safe repair resolves every blocking row.

## Exception repair

If a confirmed plan resolves most of the document but a small bounded set of rows remains unresolved, Aura may request local Harnex repair for only those row contexts.

The implemented repair boundary is deliberately narrower than global plan inference:

- at most eight unresolved rows are eligible in one import attempt;
- each Harnex generation receives only the confirmed global plan, the confirmed header row, one target source row and closed issue codes;
- source cell text is bounded again before crossing the Harnex boundary and is reduced further when capability limits require it;
- the confirmed sheet and record layout are immutable for row repair;
- the response may choose only Aura-owned date parser, description source columns and amount-strategy source columns for that exact row;
- the response schema contains no canonical date, description, amount, type or category fields;
- Aura deterministically executes the proposed row semantics against the original source row and accepts it only when normal canonical validation has no blocking issue;
- invalid response, unsafe source references, deterministic failure or `unresolved` keeps the row explicit and blocking;
- `global-plan-wrong` returns to global interpretation feedback and therefore requires a new proposal, preview and explicit confirmation.

Repair reuses the authorized `aura-transaction-schema-inference` Harnex use case. It does not introduce a third Android Binder/policy use case because the operation is still schema/source interpretation under a stricter response contract.

Partial repair never permits partial transaction preparation: the import advances only when all candidate rows are safe and the merged validation result is non-blocking.

## Category-resolution contract

After canonical rows are prepared, Aura first applies existing conservative local history/group matching. Only unresolved description/type groups are eligible for Harnex category assistance.

Category requests use ephemeral supplied category IDs/labels. Harnex may return only requested item IDs and supplied category IDs or `null`. Unknown/duplicate IDs fail closed; no Harnex result creates a category. Category suggestions remain reviewable.

Date and amount remain excluded from the initial category-classification request unless a later minimization decision changes that boundary.

## Harnex use-case contract

Current Android use cases remain:

- `aura-transaction-schema-inference` — transformation-plan proposal, structured revision and bounded row-level source interpretation under distinct closed JSON schemas;
- `aura-transaction-category-classification`.

No separate exception-repair use case is introduced in W12.2 because the existing schema-inference authorization can keep global-plan and row-repair semantics independently constrained at the Aura request/response boundary. A future split remains possible if Harnex policy/resource ownership needs independent assignment.

Use cases are local, explicitly assigned/authorized, stateless for the workflow and JSON-schema constrained. Aura does not choose the model/preset; Harnex remains the runtime owner.

## Privacy and minimization

Schema/plan inference may include bounded source-shaped row/cell content because semantic structure can no longer be inferred reliably from metadata/candidate IDs alone.

It must still exclude unless a successor decision proves necessity:

- filename/path;
- Firebase UID/email/token;
- bank account/IBAN/card identifiers intentionally extracted as metadata;
- credentials or signing information;
- cloud-backup content;
- complete ledger;
- unrestricted whole-workbook prompt content.

Aura/Harnex logs and diagnostics remain content-free. Prompt/source cells, dates, amounts, descriptions, categories and generated output are never intentionally logged.

Row repair further minimizes context by sending only the confirmed header plus the single unresolved target row per generation rather than replaying resolved rows or the full execution document.

## Availability and recovery

| Condition | Required Aura behavior |
| --- | --- |
| technical/resource safety gate fails | reject locally with specific issue; do not invoke Harnex |
| safe source has unknown/unusual structure | preserve source-shaped view and continue to Harnex interpretation when available |
| Harnex missing/unreachable/unauthorized/unready | explain assistance unavailable; keep safe manual/source-correction recovery where supported |
| invalid plan response | reject proposal; no preview/full execution |
| preview cannot be built deterministically | treat proposal as invalid/needs revision |
| user says result is wrong | invalidate that proposal for execution; capture feedback; request revised proposal or manual correction |
| confirmed plan leaves a small bounded unresolved set | attempt row-scoped declarative repair when Harnex is available; never drop or accept model-authored values |
| repair remains unresolved/unavailable | keep rows explicit and blocking; offer global revision/manual recovery |
| row repair reports global-plan-wrong | return to global feedback/new proposal/preview/confirmation |
| cancellation | cancel generation and retain no hidden commit action |
| offline | no cloud attempt |

## UX task model

The user-facing journey is:

`Upload -> Understand file -> Check interpretation -> Check transactions -> Categorize -> Review -> Done`

`Check interpretation` is a mandatory gate when Harnex has proposed source semantics. It shows representative rows, an expandable summary of how Aura will interpret the source, and clear `Yes, this is correct` / `Something is wrong` actions. Full execution is not reachable from the proposal merely because Harnex returned `resolved`.

After confirmation, bounded row repair is an internal continuation of `Check interpretation`: no transactions are prepared while repair is running or while rows remain unresolved. If repair requires a global change, the user returns to the same explicit correction/new-proposal gate rather than receiving a silently changed interpretation.

Manual correction and feedback states must remain operable with keyboard, Android touch, screen reader and text scaling. Error meaning cannot depend on color alone.

## Test contract

Deterministic CI must cover at minimum:

1. canonical V1 fast path remains unchanged;
2. arbitrary/localized headers;
3. quoted-row wrapper CSV;
4. metadata/preamble before table;
5. debit/credit and amount+direction;
6. ambiguous dates where Aura must not silently guess;
7. split descriptions;
8. repeated header/footer/multiple worksheet cases where supported;
9. one or more unresolved rows without silent loss;
10. non-financial/insufficient source returns unsupported/unresolved rather than invented transactions;
11. invalid Harnex plan/source references fail closed;
12. full execution rejects an unconfirmed proposal;
13. user rejection prevents the prior proposal from entering full execution;
14. feedback creates a new proposal/preview gate;
15. bounded row repair sends only the unresolved row/header context and deterministically re-executes accepted source references;
16. row-repair attempts to return financial values or mutate the global structure fail closed;
17. `global-plan-wrong` returns to global feedback/new confirmation rather than replacing the confirmed plan;
18. Harnex unavailable/cancelled leaves no ledger mutation;
19. diagnostics/logging contain no financial source or generated content.

Real-Harnex qualification keeps `unsafe silent mapping rate = 0` as the minimum structural safety metric. Emulator/browser tests do not replace physical GGUF/OEM/accessibility/privacy-authority release evidence.

## Acceptance

W12.2 is integration-ready when:

- the bounded raw-document reader preserves unusual but safe source shapes;
- Harnex can propose only an Aura-valid transformation plan;
- the quoted-row CSV fixture produces the expected deterministic preview;
- no plan reaches full execution without explicit confirmation;
- structured negative feedback can produce a revised proposal and a second confirmation gate;
- every full-file candidate row is resolved or explicitly unresolved;
- bounded row repair cannot mutate the confirmed global sheet/layout or author financial values, and only Aura-deterministic repaired rows can unblock the import;
- existing category/review/verified-commit invariants remain intact;
- privacy/logging/lifecycle contracts are current;
- required exact-head automated validation and affected material-UX `FULL_MEDIA` evidence pass.