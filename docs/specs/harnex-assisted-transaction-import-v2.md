# Harnex-assisted Transaction Import V2

Status: **W12.2 interactive raw interpretation in progress. Prior candidate-based W12/W12.1 remains the integrated baseline; release qualification is paused until this successor boundary is integrated.**

Active delivery tracker: [`../workstreams/harnex-assisted-transaction-import-v2.md`](../workstreams/harnex-assisted-transaction-import-v2.md).

Durable decision: [`../../adr/0009-aura-interactive-harnex-import-interpretation.md`](../../adr/0009-aura-interactive-harnex-import-interpretation.md). ADR 0009 supersedes the candidate-selection-only schema boundary from ADR 0008.

## Purpose

Aura accepts technically safe CSV/XLSX bank exports without requiring the user to reshape them to a known template. Aura preserves a bounded source-shaped view, uses authorized on-device Harnex to propose how that source maps to Aura transactions, executes only Aura-owned declarative transformation primitives, shows a deterministic preview, asks the user whether the interpretation is correct, and only after explicit confirmation executes the plan across the full source.

If the user says the Harnex result is wrong, Aura captures structured feedback and requests a revised complete proposal. Every revised proposal gets a new preview and requires confirmation again.

V1 remains the deterministic canonical fast path when a source already matches `date,description,amount`.

## User promise

- Technically safe files are not rejected merely because Aura has never seen their schema before.
- Harnex runs only through the explicitly authorized on-device Android Consumer boundary; there is no cloud fallback.
- Harnex may interpret bounded source content, but it cannot write Aura storage, create transactions, invent categories or return executable parser code.
- Aura shows what Harnex understood before full-file execution.
- A Harnex proposal is never silently accepted: the user explicitly confirms it or reports what is wrong.
- A rejected/edited proposal loses confirmation; a revised proposal must be previewed and confirmed again.
- Every candidate source row is either deterministically resolved or explicitly unresolved; rows are never silently dropped.
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
- one or more description fields;
- signed amount, debit/credit and amount+direction strategies;
- deterministic preview with source-row/column provenance;
- explicit correct/wrong user feedback after Harnex interpretation;
- structured feedback refinement loop;
- unresolved-row accounting and bounded exception repair;
- optional category suggestions from the user's existing taxonomy;
- session-only interpretation state;
- existing duplicate warning, Review, verified commit and undo semantics.

### Out of scope

- `.xls`, `.xlsm`, PDF, images or OCR;
- cloud inference fallback;
- model-generated code, scripts, arbitrary regex or spreadsheet formulas;
- model-authoritative ledger mutation;
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
  -> optional bounded Harnex exception repair for unresolved rows
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

Bounds remain authoritative. The current first-slice contract caps worksheets, logical columns, retained source rows and cell code points. Large documents use representative bounded windows; the complete workbook is not sent as one unconstrained Harnex prompt.

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
  description: { columnIndexes: number[]; joinWith: ' ' | ' · ' };
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

Future primitives require an explicit contract change; Harnex cannot smuggle new execution semantics through free text.

## Preview and provenance

Before full-file execution Aura applies the proposed plan only to a bounded representative preview. Preview rows include canonical values plus source provenance:

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

The preview is the user-facing explanation of what Harnex understood. It must be generated by Aura's deterministic executor from the proposed plan; it is not a second model-authored transaction list.

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

A previous `confirmed` marker is invalid once the plan changes.

Feedback is session-only. Aura does not silently learn a bank format, merchant rule or category preference across imports in this slice.

## Deterministic full-file execution

Only a `ConfirmedImportV2Interpretation` may enter full execution.

Execution invariants:

- every candidate source row is accounted for;
- no Harnex-generated value can bypass Aura parsing/validation;
- no date/amount/description is silently invented;
- no row is silently dropped because it does not fit the global plan;
- output remains subject to existing canonical validation, duplicate detection and Review;
- ledger mutation remains impossible before the verified commit stage.

The full executor returns resolved rows and explicit unresolved rows with closed reason codes.

## Exception repair

If a confirmed plan resolves most of the document but a small bounded set of rows remains unresolved, Aura may request local Harnex repair for only those row contexts.

Exception repair is row-scoped. It must not silently replace the confirmed global transformation plan. If Harnex concludes the global structure itself is wrong, Aura returns to interpretation feedback and requires a new global proposal/preview/confirmation.

## Category-resolution contract

After canonical rows are prepared, Aura first applies existing conservative local history/group matching. Only unresolved description/type groups are eligible for Harnex category assistance.

Category requests use ephemeral supplied category IDs/labels. Harnex may return only requested item IDs and supplied category IDs or `null`. Unknown/duplicate IDs fail closed; no Harnex result creates a category. Category suggestions remain reviewable.

Date and amount remain excluded from the initial category-classification request unless a later minimization decision changes that boundary.

## Harnex use-case contract

Current Android use cases remain:

- `aura-transaction-schema-inference` — evolves in W12.2 to return a transformation-plan proposal rather than only Aura candidate IDs;
- `aura-transaction-category-classification`.

A separate exception-repair use case may be introduced only if the existing inference use case cannot keep schema/repair semantics clear and independently testable.

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

## Availability and recovery

| Condition | Required Aura behavior |
| --- | --- |
| technical/resource safety gate fails | reject locally with specific issue; do not invoke Harnex |
| safe source has unknown/unusual structure | preserve source-shaped view and continue to Harnex interpretation when available |
| Harnex missing/unreachable/unauthorized/unready | explain assistance unavailable; keep safe manual/source-correction recovery where supported |
| invalid plan response | reject proposal; no preview/full execution |
| preview cannot be built deterministically | treat proposal as invalid/needs revision |
| user says result is wrong | invalidate confirmation; capture feedback; request revised proposal or manual correction |
| confirmed plan leaves unresolved rows | keep them explicit; optional bounded repair; never drop silently |
| cancellation | cancel generation and retain no hidden commit action |
| offline | no cloud attempt |

## UX task model

The user-facing journey remains roughly:

`Upload -> Understand file -> Check interpretation -> Check transactions -> Categorize -> Review -> Done`

The new `Check interpretation` state is a mandatory gate when Harnex has proposed source semantics. It shows representative rows, what Aura will treat as date/description/amount and clear `Correct` / `Something is wrong` actions.

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
13. user rejection invalidates prior confirmation;
14. feedback creates a new proposal/preview gate;
15. Harnex unavailable/cancelled leaves no ledger mutation;
16. diagnostics/logging contain no financial source or generated content.

Real-Harnex qualification keeps `unsafe silent mapping rate = 0` as the minimum structural safety metric. Emulator/browser tests do not replace physical GGUF/OEM/accessibility/privacy-authority release evidence.

## Acceptance

W12.2 is integration-ready when:

- the bounded raw-document reader preserves unusual but safe source shapes;
- Harnex can propose only an Aura-valid transformation plan;
- the quoted-row CSV fixture produces the expected deterministic preview;
- no plan reaches full execution without explicit confirmation;
- structured negative feedback can produce a revised proposal and a second confirmation gate;
- every full-file candidate row is resolved or explicitly unresolved;
- existing category/review/verified-commit invariants remain intact;
- privacy/logging/lifecycle contracts are current;
- required exact-head automated validation and affected material-UX `FULL_MEDIA` evidence pass.
