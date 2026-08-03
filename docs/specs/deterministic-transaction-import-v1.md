# Deterministic Transaction Import V1

Status: **Approved product direction; M0 contract frozen on 2026-08-03. No
runtime implementation has started.**

Delivery tracker:
[`12-deterministic-transaction-import-progress-plan.md`](../00-discovery/12-deterministic-transaction-import-progress-plan.md).

## Purpose

Aura accepts a deliberately structured CSV or XLSX file, validates it entirely
on the device, lets the user review and categorize the valid rows, and commits
the selected transactions only after verified local persistence.

The V1 replaces the current generic Gemini-assisted spreadsheet workflow. It
does not attempt to understand arbitrary bank exports. Files that do not match
the documented structure fail with precise local guidance and a downloadable
template.

## User promise

- File contents remain on the device during parsing and review.
- Aura never silently guesses a column, date, amount, category, duplicate, or
  malformed value.
- Every included transaction is visible before commit.
- One category can be applied to one row, a manual selection, or rows with the
  same conservative match key.
- Possible duplicates are warnings and are never removed automatically.
- Success is shown only after the canonical transaction storage has been read
  back and verified.
- CSV/XLSX imports transactions only. They are not complete Aura backups.

## Scope

### In scope

- `.csv` and `.xlsx`;
- one fixed three-column schema;
- EUR amounts;
- income/expense inference from the amount sign;
- local validation and preview;
- manual categories and batch category changes;
- exact normalized-description grouping;
- possible duplicate warnings;
- import with an explicit warning when `Uncategorized` rows remain;
- session-only undo for the latest import;
- post-import batch category correction in transaction history;
- legacy Aura transaction CSV compatibility;
- `.aura` isolation before spreadsheet parsing;
- retirement of the current Gemini runtime path after the replacement passes
  its release gates.

### Out of scope

- arbitrary column mapping;
- aliases or localized header names;
- `.xls`, `.xlsm`, PDF, image or OCR import;
- multi-currency or exchange-rate conversion;
- fuzzy merchant recognition;
- AI classification;
- persistent description-category rules;
- automatic changes to existing transactions;
- automatic duplicate removal;
- persisted import drafts or import batch metadata;
- reconciliation or Open Banking.

## File classification order

Aura must classify a selected file in this order:

1. Inspect the binary prefix with `isAuraPortableArchive`.
2. If the `.aura` signature is present, stop before PapaParse or ExcelJS and
   direct the user to `Import Aura archive`.
3. Enforce the outer file-size and supported-extension gates.
4. Parse the spreadsheet locally.
5. Detect the existing Aura transaction CSV header and route it to the local
   legacy transaction importer.
6. Otherwise validate the deterministic V1 schema.
7. If the V1 schema does not match, fail locally with template guidance.

There is no AI, network, Firebase, analytics, or generic fallback after step 7.
A file renamed to `.csv` or `.xlsx` does not bypass signature or structural
checks.

## Resource limits

The following limits are part of the V1 contract:

| Limit | CSV | XLSX |
|---|---:|---:|
| Compressed/input file size | 10 MiB | 5 MiB |
| Non-empty rows including header | 20,001 | 20,001 |
| Columns | exactly 3 | exactly 3 |
| Description length after trim | 2,000 Unicode code points | 2,000 Unicode code points |
| Worksheet count used | n/a | first worksheet only |
| ZIP entry count | n/a | 1,000 |
| Declared uncompressed ZIP total | n/a | 32 MiB |
| Amount absolute maximum | EUR 999,999,999.99 | EUR 999,999,999.99 |

Definitions:

- 1 MiB is 1,048,576 bytes.
- The 20,001-row limit is one header plus at most 20,000 transaction rows.
- Completely empty rows do not count.
- Unicode code-point counts are used instead of UTF-16 code-unit counts.

The XLSX reader performs a bounded ZIP central-directory preflight before
calling ExcelJS. It rejects invalid central-directory bounds, ZIP64, encrypted
entries, more than 1,000 entries, any entry whose declared uncompressed size
exceeds 32 MiB, or a total declared uncompressed size above 32 MiB. This is a
defense-in-depth resource gate; the 20,001-row and three-column checks still run
during worksheet extraction.

CSV parsing must use PapaParse's local `File` path with incremental row handling
or an equivalent bounded approach. It must abort once the row limit is crossed
and must not retain a second complete raw-text copy after preparation.

## Structured file contract

### Header

The first non-empty row must contain exactly, and in this order:

```text
date,description,amount
```

Header comparison:

- strips an optional UTF-8 BOM from the first cell;
- trims outer whitespace;
- compares lower-case ASCII header names;
- permits `Date, Description, Amount`;
- rejects aliases, duplicate headers, reordered headers, missing headers and
  extra headers.

### CSV dialect

- UTF-8 only;
- comma or semicolon delimiter;
- one delimiter for the complete file;
- standard RFC-style double-quote escaping;
- LF or CRLF line endings;
- blank rows ignored;
- no comments or metadata rows before the header.

Decimal rules:

- comma-delimited CSV uses `.` as the decimal separator;
- semicolon-delimited CSV may use either `.` or `,`, but the entire amount
  column must use one convention;
- grouping/thousands separators are not supported;
- exponent notation is not supported;
- currency symbols are not supported in the amount cell;
- at most two decimal digits are accepted.

Examples:

```csv
date,description,amount
2026-08-01,Supermarket,-42.70
2026-08-02,Salary,2500.00
```

```text
date;description;amount
2026-08-01;Supermercato;-42,70
2026-08-02;Stipendio;2500,00
```

### XLSX rules

- only `.xlsx` is accepted;
- only the first worksheet is read;
- additional worksheets produce `additional_worksheets_ignored`;
- the first non-empty row is the header;
- merged cells intersecting the required data range are rejected;
- hidden first worksheets are still treated as the first worksheet and produce
  `hidden_first_worksheet` so the user understands what was read;
- numeric amount cells and valid decimal strings are accepted;
- Excel date cells and ISO date strings are accepted if they resolve to the
  same calendar-day contract;
- formulas in any required header or data cell are rejected, even when a cached
  result exists;
- macros and external content are never executed; `.xlsm` is unsupported.

## Row contract

### `date`

- required;
- canonical string format `YYYY-MM-DD`;
- must be a real Gregorian calendar date;
- XLSX date cells are converted to that calendar-day form without a local/UTC
  day shift;
- a future date is valid but receives `future_date`;
- no fallback to today is permitted.

### `description`

- required after trim;
- maximum 2,000 Unicode code points;
- line breaks inside a correctly quoted cell are normalized to a single space;
- NUL and disallowed control characters are rejected;
- the original normalized text becomes `Transaction.description`;
- React renders it as text, never HTML.

Formula-like leading characters are not altered in storage. When Aura exports
transactions to CSV, every string cell beginning with `=`, `+`, `-`, `@`, tab,
carriage return or line feed must be spreadsheet-formula escaped at the export
boundary. This export hardening is required before V1 release so imported text
cannot become an active formula after a later export.

### `amount`

- required;
- finite;
- non-zero;
- maximum two decimal places;
- absolute value no greater than EUR 999,999,999.99;
- parsed into signed integer cents before mapping;
- positive cents map to `income`;
- negative cents map to `expense`;
- the stored `Transaction.amount` is the positive absolute decimal value.

`-0`, `+0`, `0.00`, NaN, Infinity, exponent notation, ambiguous separators and
values outside the safe contract are errors.

## Issue model

Every issue contains:

```ts
type ImportIssueSeverity = 'error' | 'warning';

interface ImportIssue {
  code: ImportIssueCode;
  severity: ImportIssueSeverity;
  rowNumber?: number;
  column?: 'date' | 'description' | 'amount';
  messageKey: string;
}
```

Issues never contain the raw cell value, description, amount, filename, user ID
or email. UI copy is derived locally from `messageKey`, row number and safe
limits.

### Blocking file issue codes

| Code | User copy |
|---|---|
| `unsupported_file_type` | Use a CSV or XLSX file. |
| `invalid_csv_encoding` | Save the CSV as UTF-8 and try again. |
| `invalid_csv_syntax` | Fix the CSV quoting or separators and try again. |
| `file_too_large` | This file exceeds the supported size limit. |
| `invalid_xlsx_container` | This Excel file cannot be read safely. |
| `xlsx_resource_limit` | This Excel file expands beyond the supported limit. |
| `worksheet_missing` | The workbook does not contain a worksheet. |
| `empty_file` | The file does not contain transaction rows. |
| `row_limit_exceeded` | This file contains more than 20,000 transaction rows. |
| `header_missing` | The first non-empty row must contain the required header. |
| `header_column_count` | The header must contain exactly three columns. |
| `header_duplicate` | Each required column can appear only once. |
| `header_unknown` | Use only date, description, and amount. |
| `header_order` | Use the column order date, description, amount. |
| `mixed_csv_delimiter` | Use one CSV delimiter throughout the file. |
| `mixed_decimal_format` | Use one decimal format throughout the amount column. |

### Blocking row issue codes

| Code | Column |
|---|---|
| `row_column_count` | row |
| `date_required` | date |
| `date_format` | date |
| `date_invalid` | date |
| `description_required` | description |
| `description_too_long` | description |
| `description_control_character` | description |
| `amount_required` | amount |
| `amount_format` | amount |
| `amount_zero` | amount |
| `amount_precision` | amount |
| `amount_out_of_range` | amount |
| `formula_cell_not_supported` | affected column |
| `merged_cell_not_supported` | affected column |

### Warning codes

| Code | Meaning |
|---|---|
| `future_date` | Valid row dated after the device's current calendar day |
| `possible_duplicate` | Same duplicate key in the batch or current ledger |
| `additional_worksheets_ignored` | Only the first worksheet is used |
| `hidden_first_worksheet` | The worksheet being read is hidden |
| `uncategorized_rows` | Included rows still use the fallback label |

The commit action is disabled while any blocking issue exists. Warnings require
review but do not automatically exclude a row.

## Prepared review contract

The service layer returns a prepared object before any persistence mutation:

```ts
interface PreparedTransactionImport {
  sourceKind: 'structured-csv' | 'structured-xlsx';
  preparedAt: string;
  baseLedgerFingerprint: string;
  rows: PreparedImportRow[];
  issues: ImportIssue[];
  summary: ImportSummary;
  undoStack: ImportReviewUndoEntry[];
}

interface PreparedImportRow {
  rowId: string;
  sourceRowNumber: number;
  date: string;
  description: string;
  signedAmountMinor: number;
  type: 'expense' | 'income';
  category: string;
  categorySource: 'uncategorized' | 'manual' | 'batch' | 'same-description';
  included: boolean;
  selectedForBatch: boolean;
  descriptionMatchKey: string;
  duplicateMatches: DuplicateMatch[];
  issues: ImportIssue[];
}

interface DuplicateMatch {
  source: 'batch' | 'ledger';
  referenceId: string;
  count: number;
}
```

`rowId` is an ephemeral review ID. Final transaction UUIDs are generated at
commit so a stale review cannot reserve or leak permanent identifiers.

`DuplicateMatch` represents a group rather than copying every colliding ID into
every row. `referenceId` is an in-memory row or transaction identifier used as
an opaque group reference, while `count` records the other matching rows. This
keeps duplicate metadata linear at the 20,000-row boundary.

The base ledger fingerprint is SHA-256 over a deterministic projection of the
current transactions sorted by ID. It includes the fields relevant to duplicate
checks and ID collision detection. It is kept in memory and is not logged.

## Description matching

The V1 match key is versioned and contains transaction type plus normalized
description. Normalization:

1. Unicode NFKC;
2. trim;
3. locale-independent lower-case conversion;
4. all whitespace sequences collapsed to one ASCII space;
5. digits and punctuation preserved.

The amount is excluded. Income and expense never share a match group. There is
no fuzzy comparison, token removal, merchant inference or persisted rule.

When the user selects a category, the available scopes are:

- `Only this transaction`;
- `Selected transactions (N)` when batch selection is active;
- `Transactions with the same description (N)` when N is greater than one.

The scope and affected count are shown before applying. The review keeps an
in-memory undo stack for category, inclusion and duplicate-exclusion actions.
If an assigned category stops being active during review, affected rows return
to `Uncategorized`; historical undo deltas are sanitized so undo cannot restore
the inactive category.

## Duplicate detection

The possible-duplicate key is:

```text
calendar date + signed integer cents + normalized description
```

It is computed independently from the category match key and compared against:

- other prepared rows;
- current canonical transactions.

All colliding rows are marked. The user may keep or exclude any of them and may
use `Exclude all possible duplicates`, followed by an explicit confirmation.
No existing transaction is modified or removed.

## Review UX contract

### Steps

1. `Upload`
2. `Validate`
3. `Categorize`
4. `Review and import`
5. `Done`

There is no AI consent, AI confidence, model selection, cache bypass or remote
processing copy.

### Collection strategy

The review may contain 20,000 rows and must not render them all at once.

- 100 rows per page;
- stable pagination after sorting/filtering;
- filters for `All`, `Uncategorized`, `Warnings`, `Possible duplicates` and
  `Excluded`;
- summary counts always cover the complete prepared import, not the page;
- batch selection supports current page and all filtered rows as distinct
  actions with an explicit count;
- changing filter or page does not clear batch selection;
- focus moves to the page heading after pagination;
- loading, empty filter, blocking error, warning, success and commit failure
  states are required.

### Inclusion and batch selection

`Included in import` and `Selected for batch edit` are separate states and
controls. The normal row action opens details. A dedicated `Select` action
enters batch mode. The UI must not reuse one checkbox for both meanings.

### Uncategorized behavior

`Uncategorized` is a fallback transaction label, not automatically inserted
into the user's active category list. It remains visible in ledger-derived
filters and reports. Category actions offer active categories only.

If included rows remain uncategorized, final confirmation states the exact
count and offers:

- `Go back and categorize`;
- `Import with Uncategorized`.

The done screen links to transaction history filtered to `Uncategorized`.

### Closing the review

Before a file is prepared, close is immediate. After preparation or a review
change, close requires:

> Close import? Your review and category changes will be lost. The source file
> is not stored by Aura.

Closing, browser refresh or app termination clears the in-memory draft. V1 does
not use `beforeunload`, persistent draft storage or background resume.

## Transaction mapping

At commit, every valid included row maps to:

| Transaction field | V1 value |
|---|---|
| `id` | `crypto.randomUUID()` with collision retry |
| `amount` | absolute integer cents divided by 100 |
| `type` | derived from signed cents |
| `category` | active category selected by the user or `Uncategorized` |
| `date` | `YYYY-MM-DDT00:00:00.000Z` |
| `title` | first 80 Unicode code points of the normalized description |
| `description` | complete normalized description |
| `paymentMethod` | `Bank Transfer` |
| `reportingClass` | omitted |
| `reportingNote` | omitted |
| `verified` | omitted |

No attachment, recurring, source, match, duplicate or batch field is added.

## Verified commit protocol

The commit service owns persistence. React components must not call
`addTransactions` and immediately present success.

1. Reject if blocking issues remain or no rows are included.
2. Load canonical `AppData` through `appDataRepository.loadAppDataStrict()`.
3. Recompute the ledger fingerprint. If it differs from the prepared
   fingerprint, return `ledger_changed`, recompute duplicate warnings and
   require the user to review again.
4. Generate collision-checked transaction UUIDs and map final transactions.
5. Construct and validate the complete next `AppData` in memory.
6. Preserve the exact previous serialized transactions value for rollback.
7. Persist only the canonical transactions storage key through a dedicated
   strict repository method; other AppData keys are not rewritten.
8. Read canonical `AppData` back strictly.
9. Verify every imported transaction field and the unchanged non-transaction
   projections.
10. On success, hydrate React state with the verified data and return imported
    IDs plus immutable imported projections for session undo.
11. On write or read-back failure, restore the previous transactions value and
    verify rollback before returning failure.
12. If rollback verification fails, expose a blocking recovery error and do not
    mutate React state.

Because one localStorage key is replaced synchronously, no cross-key journal is
introduced. The protocol still requires explicit failure-injection tests for
quota, serialization, write, read-back and rollback failure.

### Session undo

The success toast offers `Undo import` for 10 seconds while the current
application session remains active. The undo closure keeps only imported UUIDs
and their immutable projections in memory.

Undo reloads the current ledger and removes an imported transaction only when
its current projection still equals the committed projection. Edited or already
deleted imported rows are preserved and reported as skipped. The resulting
transactions key is persisted and read back through the same verified protocol.
Reloading the page ends the undo capability.

### History batch category change

History supports explicit selection mode. Category changes:

- operate on stable transaction IDs;
- use one reducer/service command;
- change `category` only;
- preserve every other field;
- validate that the selected category is active at commit time;
- offer a 10-second undo using per-ID previous categories;
- skip missing transactions rather than replacing the complete ledger array.

## Privacy and security requirements

- Source file, prepared rows and undo metadata remain in memory only.
- No raw row, filename, description, date, amount, category, email or user ID is
  written to logs, errors, analytics or network requests.
- Technical diagnostics may contain only issue code, phase, duration bucket and
  aggregate row count.
- File input references, ArrayBuffers and object URLs are released after close,
  commit or replacement.
- Admins cannot access imported content.
- Imported transactions follow existing local deletion, archive export and
  opt-in encrypted cloud-backup behavior.
- Formula cells are rejected and later CSV export formula-escapes all string
  cells.
- React renders imported descriptions as text.
- Gemini historical Firestore documents are not deleted by this initiative.
- A future AI or remote categorization path requires a new product, privacy,
  security, subprocessor and AI-governance decision.

## Accessibility and design-system requirements

- Reuse current Dialog, Button, Input, CategoryPicker, toast, focus-trap and
  semantic-token patterns before introducing new primitives.
- No raw colors or screen-specific theme overrides.
- Light and dark modes expose the same error/warning/selection information.
- Progress is available as text, not color alone.
- Errors link to their row and move focus predictably.
- Pagination, filters, selection counts and category scopes have accessible
  names.
- All actions are keyboard reachable with visible focus.
- Touch targets remain at least 44 by 44 CSS pixels.
- Reduced-motion behavior follows the shared motion utilities.
- The primary action is one clear `Import N transactions` button; destructive
  or exclusion actions are secondary.

## Test contract

### Domain/data

- every issue code and limit boundary;
- CSV dialects and malformed quoting;
- XLSX central-directory preflight, worksheet and formula cases;
- local/UTC date boundaries and leap days;
- signed-cent parsing and range boundaries;
- normalization and match-key versioning;
- duplicate keys within batch and against ledger;
- mapping and UUID collision retry;
- no mutation of input objects.

### Service/state

- ledger fingerprint change;
- strict transaction-only write;
- exact read-back;
- quota/write/read-back failure;
- successful rollback and rollback failure;
- session undo with unchanged, edited, deleted and mixed rows;
- category batch change and per-ID undo;
- no unrelated field or AppData-key change.

### React/E2E

- all five steps and non-happy-path states;
- pagination and selection across pages;
- same-description category scope;
- Uncategorized confirmation;
- duplicate keep/exclude choices;
- close-warning behavior;
- template downloads;
- CSV and XLSX happy paths;
- commit, reload and history correction;
- `.aura` and Aura CSV legacy isolation;
- no network call during the complete import;
- formula-safe CSV export;
- keyboard, axe, light/dark, reduced motion and 320/360/390/430 px layouts;
- Android API 36 bundled-WebView file picker and template download smoke.

## Release and rollback

Release requires all automated checks, the declared resource fixture on mobile
targets, installed-PWA verification, Android bundled smoke, manual screen-reader
review and documentation sync.

No persisted schema migration is required. A client-bundle rollback does not
remove already imported normal transactions. Because rolling back to the old
bundle could re-expose Gemini, rollback configuration must remain without a
Gemini key and the old import entrypoint must be treated as unavailable until a
security owner approves otherwise.

## Acceptance criteria

1. A valid canonical CSV imports the exact reviewed transactions after reload.
2. A valid XLSX produces the same prepared rows as the equivalent CSV.
3. Invalid and oversized files do not mutate storage.
4. Exact-description category propagation affects only the disclosed rows.
5. Duplicate warnings never remove data automatically.
6. Uncategorized import requires explicit confirmation and remains correctable
   in history.
7. Commit failure never produces a success state and verified rollback restores
   the previous transaction storage.
8. `.aura` and Aura CSV legacy paths remain isolated and functional.
9. The import emits no network request and logs no financial content.
10. Gemini runtime, client key, model/admin import surfaces and provider
    dependency are absent from the released path.
