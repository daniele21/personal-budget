# Harnex-assisted Transaction Import V2

Status: **Approved implementation contract; W0 frozen on 2026-09-08. Runtime implementation pending.**

Active delivery tracker: [`../workstreams/harnex-assisted-transaction-import-v2.md`](../workstreams/harnex-assisted-transaction-import-v2.md).

## Purpose

Aura accepts a reasonably structured CSV/XLSX bank export without requiring the user to rename columns to the V1 `date,description,amount` schema. Aura discovers and profiles the spreadsheet locally, optionally asks the installed Harnex Android runtime to select among Aura-generated schema candidates, extracts transactions deterministically, optionally asks Harnex to classify unresolved transaction-description groups into the user's existing categories, then requires the existing Aura review/verified-commit path before ledger mutation.

V2 extends rather than replaces V1. A file already matching the canonical V1 schema uses the existing deterministic fast path without schema inference.

## User promise

- Spreadsheet parsing, candidate generation, extraction, review and commit remain Aura-owned and local-first.
- Harnex assistance runs only through the explicitly authorized on-device Android Consumer boundary; there is no cloud fallback.
- Aura never lets the model invent executable parsing logic, arbitrary columns, a category outside the supplied set, or a ledger write.
- Ambiguous schema understanding is surfaced for user correction instead of silently guessed.
- Harnex absence, authorization failure, model unavailability or inference failure leaves a usable manual mapping/import path.
- Every included transaction remains reviewable before the existing verified commit.

## Scope

### In scope

- `.csv` and `.xlsx` within the existing import resource/security envelope;
- arbitrary/localized header labels and bounded metadata rows before the table;
- selecting the transaction worksheet when multiple sheets exist;
- one selected transaction date column;
- one or more description columns;
- these Aura-owned amount strategies:
  - `signed-negative-expense`;
  - `signed-positive-expense`;
  - `debit-credit`;
  - `amount-direction`;
- EUR-only ledger normalization for the first V2 slice;
- manual schema mapping on Android when Harnex is unavailable and in browser/E2E harnesses;
- optional Harnex schema selection and category classification on Android;
- local history resolution before category inference;
- session-only import/intelligence state;
- existing duplicate warning, ledger fingerprint, review, verified commit and undo semantics.

### Out of scope

- `.xls`, `.xlsm`, PDF, images or OCR;
- arbitrary spreadsheet formulas or model-generated parsing expressions;
- FX conversion or automatic multi-currency normalization;
- bank connectivity/Open Banking;
- automatic creation/rename/deletion of categories;
- financial advice, budgeting advice or transaction rewriting;
- persistent merchant-category learning in this slice;
- persisting source filename/file content, Harnex prompts/results, import batch/provider/model metadata or source-bank metadata in `Transaction`.

## Processing stages

```text
selected file
  -> existing outer file/signature/resource gates
  -> local generic spreadsheet discovery/profiling
  -> Aura-generated schema candidates
  -> V1 fast path OR manual/Harnex-assisted mapping
  -> user-confirmed mapping when ambiguous/edited
  -> deterministic extraction and row validation
  -> local duplicate/history/category resolution
  -> Harnex category batches for unresolved groups when available
  -> existing review
  -> existing verified transaction-only commit
```

The model is never the parser and never writes the ledger.

## Generic spreadsheet profile

Aura may expose to its schema inferencer only bounded structural information needed to choose among candidates. Conceptually:

```ts
interface SpreadsheetProfile {
  sourceKind: 'csv' | 'xlsx';
  sheets: SheetProfile[];
}

interface SheetProfile {
  id: string;
  name: string;
  headerCandidates: HeaderCandidate[];
  columns: ColumnProfile[];
  sampleRows: SampleRow[];
  dateCandidates: DateCandidate[];
  amountCandidates: AmountCandidate[];
}
```

Profiles use opaque candidate/column IDs. Samples are bounded and selected locally; a complete workbook is not sent through the Harnex inference boundary.

Existing CSV/XLSX protections remain authoritative: file/row/ZIP bounds, UTF-8 gate, safe XLSX preflight and formula/resource controls must not be weakened to support profiling.

## Schema candidate contract

Aura owns every executable candidate.

```ts
interface DateCandidate {
  id: string;
  columnId: string;
  parser: AuraDateParserId;
}

type AmountCandidate =
  | { id: string; strategy: 'signed-negative-expense'; columnId: string }
  | { id: string; strategy: 'signed-positive-expense'; columnId: string }
  | { id: string; strategy: 'debit-credit'; debitColumnId: string; creditColumnId: string }
  | { id: string; strategy: 'amount-direction'; amountColumnId: string; directionColumnId: string; directionMapId: string };
```

Harnex may select candidate IDs and description columns; it may not return formulas, code, parser configuration outside the advertised candidates, arbitrary column names as authority, or a new amount strategy.

The schema result is closed:

```ts
type SchemaInferenceResult =
  | {
      status: 'resolved';
      sheetId: string;
      headerCandidateId: string;
      dateCandidateId: string;
      descriptionColumnIds: string[];
      amountCandidateId: string;
    }
  | { status: 'ambiguous'; ambiguities: SchemaAmbiguity[] }
  | { status: 'unsupported' };
```

Aura rejects/falls back on unknown IDs, duplicate IDs where uniqueness is required, missing required fields, invalid description-column references or any response that fails the JSON schema. Numeric model confidence is not correctness authority.

## Mapping confirmation and extraction

A resolved model suggestion is still an Aura mapping. Users can inspect/edit the mapping before extraction when the UX contract requires it; every model-reported ambiguity requires explicit resolution.

After a mapping is accepted, Aura deterministically produces candidate rows containing at minimum:

```ts
interface ImportedTransactionCandidate {
  sourceRowNumber: number;
  date: string;
  description: string;
  signedAmountMinor: number;
  type: 'expense' | 'income';
}
```

Harnex is not used to parse every date/amount row. Invalid or ambiguous values remain normal Aura validation issues and do not become fallback transactions.

## Category-resolution contract

Aura first groups prepared rows by the existing conservative normalized-description key plus transaction type and consults unambiguous local ledger evidence. Only unresolved unique groups are eligible for Harnex.

Because active categories are currently string-owned, Aura generates ephemeral IDs for the request:

```ts
interface CategoryClassificationRequest {
  categories: Array<{ id: string; label: string }>;
  items: Array<{ id: string; description: string; type: 'expense' | 'income' }>;
}

interface CategoryClassificationResult {
  items: Array<{ id: string; categoryId: string | null }>;
}
```

Rules:

- every returned item ID must have been requested;
- every non-null category ID must be in the supplied category set;
- duplicate/unknown IDs invalidate the affected response according to the adapter contract;
- missing items remain unresolved/reviewable;
- no Harnex result creates a new category;
- model self-reported confidence is not required and cannot bypass review/validation.

Requests are packed by the Harnex-advertised input limit minus prompt/schema overhead and a safety margin. Aura submits at most one category generation at a time; Harnex owns runtime scheduling/resource policy.

## Harnex use-case contract

Initial Android use cases:

- `aura-transaction-schema-inference`;
- `aura-transaction-category-classification`.

Both are expected to be Harnex-owned, explicitly assigned/authorized to the relevant Aura Android identity, stateless for this workflow, JSON-schema constrained, with model/preset/runtime selection owned by Harnex rather than Aura. Aura consumes only the published Harnex Consumer SDK through a typed native Capacitor adapter.

Aura release and debug package identities are separate consumers and must be authorized according to the Harnex caller-identity/signing policy. A successful capability discovery is not authority to skip prepare-time authorization/readiness checks.

## Data minimization

### Schema inference may include

- opaque sheet/header/column/candidate IDs;
- sheet/header display labels where needed;
- bounded column statistics/type hints;
- bounded representative cell samples;
- candidate strategy metadata.

It must not include unless a later approved contract proves necessity:

- entire workbook or all transaction rows;
- filename/path;
- Firebase UID/email/token;
- account identifier/IBAN/card identifier;
- ledger balance or complete ledger;
- cloud-backup content.

### Category inference may include

- opaque group IDs;
- selected/normalized transaction description text needed for classification;
- expense/income type;
- ephemeral active-category IDs and labels.

Date and amount are excluded from the initial category request because category selection must be justified from description/type first; adding them requires an explicit minimization review.

## Retention, logging and lifecycle

- Aura keeps source/profile/mapping/classification state in memory for the import session only unless a later persistence contract is approved.
- Aura does not log financial cell samples, transaction descriptions, amounts, categories or generated output.
- Harnex normal telemetry/logging for these use cases must remain content-free; the Consumer contract does not authorize prompt/output persistence.
- Dialog/workflow cancellation must cancel active generation and close/deactivate/release owned session resources.
- Host/process/transport failure is reported truthfully; Aura does not silently resubmit a completed logical unit in a way that can duplicate semantic work.

## Availability and recovery

The import remains usable when Harnex is unavailable.

| Condition | Required Aura behavior |
| --- | --- |
| Harnex not installed/unreachable | explain automatic assistance is unavailable; offer manual mapping |
| Aura not authorized | explain authorization requirement; keep manual path |
| use case disabled/model unavailable/incompatible | typed unavailable state; keep manual path |
| schema response invalid/ambiguous | manual mapping/review; no silent guess |
| category batch partial/invalid | keep valid accepted results only where contract permits; unresolved items remain reviewable |
| cancellation | stop active inference and retain no hidden commit action |
| offline | no cloud attempt; local/manual path remains available |

## UX state model

The user-facing task model is `Upload -> Understand file -> Check transactions -> Categorize -> Review -> Done`. UI copy describes the user task rather than internal Binder/model/batch mechanics. Reachable loading, unavailable, unauthorized, ambiguous, partial-failure, cancellation and recovery states require accessible semantics and non-color-only meaning.

## Test and qualification contract

Normal CI remains deterministic. It uses synthetic CSV/XLSX fixtures, fake schema/category inferencers and native bridge fakes for contracts, response validation, fallback and lifecycle state.

A separate real-Harnex evaluation lane measures model behavior against synthetic goldens. Minimum safety metric for automatic schema mapping is:

```text
unsafe silent mapping rate = 0
```

A difficult/unsupported file may require manual review; a wrong automatic financial mapping is not acceptable. Category quality is evaluated against multiple user-category taxonomies to detect hard-coded taxonomy behavior.

Cross-app Android automation must cover host absent, pending/authorized identity, disabled/unready use case, successful schema/category generation, cancellation and reconnect. Physical ARM64/GGUF performance/resource/accessibility evidence is release evidence only when required by the exact release claim.

## Acceptance

V2 implementation is acceptable when:

1. V1 canonical imports remain deterministic and regression-green;
2. an unknown but supported synthetic CSV/XLSX can be imported through manual mapping with Harnex absent;
3. an authorized packaged Android Aura can obtain JSON-schema-constrained Harnex schema/category assistance without cloud traffic;
4. invalid/ambiguous model output cannot silently alter parsing, categories or ledger semantics;
5. the existing review/verified-commit path remains the only canonical transaction write;
6. privacy/logging/lifecycle tests show bounded session data and cleanup;
7. required automated exact-head validation and affected material-UX evidence pass before integration, with release-only real-environment gaps tracked separately.
