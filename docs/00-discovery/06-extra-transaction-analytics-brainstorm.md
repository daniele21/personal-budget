# Extra Transaction Analytics Brainstorm

## Problem Statement

Aura Finance currently treats every transaction in the same way for totals, budgets, category breakdowns, comparisons, and year-in-review reports. This is correct for the real ledger, but it makes reports noisy when a month contains one-off expenses that are real cash outflows but not representative of the user's normal spending pattern.

The product need is not to hide or delete those transactions. The need is to support two analytical views over the same transaction ledger:

- **Actual view**: everything that really happened, including extra one-off expenses.
- **Normalized view**: regular income and spending, excluding transactions marked as extra.
- **Extra-only view**: one-off transactions isolated so the user can understand their impact.

## Current Context

- Aura Finance is local-first. Financial records and reports are computed locally in the browser.
- The canonical ledger is `Transaction[]`; reports, budgets, comparisons, search, and year review all read from the same ledger.
- `Transaction` currently has no field that expresses reporting treatment or whether a transaction is unusual.
- Category is already used for semantic classification like food, rent, transport, and utilities. Using a category named `Extra` would lose the real category meaning.
- Existing reports use pure domain functions in `src/domain/finance.ts`, which is the right layer for a reusable reporting lens.

## Recommended Concept

Add a separate transaction-level analytics marker instead of creating a special category.

Proposed field:

```ts
export type TransactionReportingClass = 'regular' | 'extra';

export interface Transaction {
  // existing fields...
  reportingClass?: TransactionReportingClass;
  reportingNote?: string;
}
```

Default behavior:

- Missing `reportingClass` means `regular`.
- `extra` means the transaction remains in the ledger but can be excluded from normalized analytics.
- `reportingNote` is optional and can explain why it was marked as extra, for example "vacation", "medical", "furniture", or "car repair".

This keeps category and reporting intent separate:

- Category answers: "What kind of expense was this?"
- Reporting class answers: "Should this affect my normal spending baseline?"

## Confirmed Decisions

- Budget progress should show both actual and net-of-extras values. The default budget progress view includes extras so the user sees full cash impact first.
- The extra marker applies to both expenses and income. One-off income, bonuses, and reimbursements can also be excluded from normalized analytics.
- Recurring-generated transactions should not be marked as extra. Recurring items represent baseline financial activity in this model.
- Import and export must preserve `reportingClass` and `reportingNote` so report semantics survive backup, restore, and CSV round trips.

## Analytics Lenses

The same date range should support three lenses:

| Lens | Includes | Purpose |
|---|---|---|
| Actual | All transactions | Real cash movement and full financial history |
| Normalized | Transactions where `reportingClass !== 'extra'` | Budget baseline, month-over-month trend, recurring habit analysis |
| Extra-only | Transactions where `reportingClass === 'extra'` | Understand exceptional spending and its impact |

Recommended labels in the UI:

- `Actual`
- `Net of extras`
- `Extras`

The labels should avoid implying that extra transactions are fake or ignored. They are real, just analytically separated.

## User Experience Ideas

### Marking A Transaction

Add a simple toggle or checkbox in transaction create/edit:

- Label: `Mark as extra`
- Helper text only if needed: `Keep it in totals, but separate it from normalized reports.`

In history and report transaction lists, show a small badge:

- `Extra`

Batch edit could later allow selecting multiple transactions and marking them as extra.

### Reports

Add a segmented control to report pages:

- `Actual`
- `Net of extras`
- `Extras`

The page should remember the selected lens locally per session or preference, but default to `Actual` to preserve current behavior.

For high-signal reporting, show both actual and normalized numbers together in key places:

- Monthly expenses: `€2,450 actual`, `€1,850 net of extras`
- Extra impact: `€600 extras this period`
- Month-over-month: calculate using selected lens, but mention when extras materially changed the actual total.

### Dashboard

Keep primary ledger totals factual. For daily decision-making, consider showing:

- `Safe to Spend` based on normalized spending by default.
- A compact line: `Extras this month: €X`.

Confirmed behavior: the default dashboard and cash-pressure view should include extras, with net-of-extras shown as a secondary analytical comparison where useful.

### Category Breakdown

Do not remove category visibility for extras. In the extra-only lens, category breakdown becomes useful:

- Extra travel
- Extra home
- Extra medical
- Extra gifts

This helps answer: "What kind of one-off spending hit this month?"

## Confirmed Decision Analysis

### 1. Budget Progress Includes Extras By Default And Shows Both Views

What must be decided:

Whether category budget progress should include extra transactions by default.

Why it matters:

Budgets can mean either "hard cash control" or "normal monthly habit target". An extra medical bill or holiday booking may blow up a budget even though it should not redefine the user's routine spending.

Options:

| Option | Pros | Cons |
|---|---|---|
| Include extras in budgets | Most financially conservative; every euro spent counts | Budgets become noisy and less useful for normal habit tracking |
| Exclude extras from budgets | Budgets reflect normal recurring behavior better | User might under-estimate actual cash pressure |
| Show both | Most transparent; actual and normalized budget progress side by side | More UI complexity |

Recommendation:

Confirmed: show both when space allows, with actual budget progress as the default. Display net-of-extras as the comparison view and show an explicit `+€X extras` impact so the user can distinguish full cash pressure from normal habit tracking.

### 2. Income Supports The Same Extra Marker

What must be decided:

Whether one-off income, such as a bonus or reimbursement, can also be marked as extra.

Why it matters:

Normalized net savings can be distorted by both unusual expenses and unusual income.

Options:

| Option | Pros | Cons |
|---|---|---|
| Expense-only extras | Simple and matches the immediate request | Bonuses/reimbursements still distort normalized savings |
| Income and expense extras | More correct analytics model | Requires clearer copy so users understand it applies to both directions |

Recommendation:

Confirmed: support both income and expense with the same `reportingClass`. The UI can still phrase the most common flow as "extra expense", but the model must support normalized income and net savings analysis.

### 3. Recurring-Generated Transactions Are Not Extra

What must be decided:

Whether a recurring template or a single recurring occurrence can be marked as extra.

Why it matters:

Recurring items usually represent baseline spending, but a single edited occurrence may be exceptional.

Options:

| Option | Pros | Cons |
|---|---|---|
| Never extra for recurring | Simple and preserves recurring as baseline | Cannot handle one-off variation in a recurring item |
| Whole recurring series can be extra | Useful for non-baseline recurring costs | Could hide a real recurring habit from normalized reports |
| Single occurrence can be extra | Most accurate | Needs UI clarity in the recurring occurrence editor |

Recommendation:

Confirmed: recurring-generated transactions should not be marked as extra. Do not add `reportingClass` to recurring templates or generated recurring occurrences in the initial implementation. If a real-world exception emerges later, it should be handled through a separate product decision rather than silently weakening the recurring baseline model.

### 4. Import And Export Preserve The Marker

What must be decided:

Whether CSV/import/export includes `reportingClass` and `reportingNote`.

Why it matters:

Aura Finance preserves historical data for accurate reports. If backup/export drops the marker, normalized reports become inconsistent after restore or migration.

Options:

| Option | Pros | Cons |
|---|---|---|
| Internal only | Smaller implementation | Data portability is incomplete |
| Include in export/import | Preserves analytics meaning | CSV schema changes need validation and docs |

Recommendation:

Confirmed: include both fields in backup and CSV import/export once the feature is implemented. Missing values should default to `regular`.

## Safe Assumptions

- Existing transactions can safely default to `regular`.
- No new backend, provider, subprocessor, or AI capability is needed.
- Privacy impact is limited to an additional local metadata field attached to existing financial records.
- The domain layer should own filtering and totals for analytics lenses; UI pages should not duplicate filtering logic.
- The initial UI can use a binary `extra` marker instead of a more complex tag system.
- Budget, dashboard, and cash-pressure summaries should default to actual values that include extras, with net-of-extras available as a secondary lens.

## Implementation Shape

### Domain

Add pure helpers in `src/domain/finance.ts`:

- `getTransactionReportingClass(transaction)`
- `filterByReportingClass(transactions, lens)`
- `calculateTotalsByLens(transactions, lens)`
- `getExtraImpact(transactions)`

Update existing report functions to accept an optional lens or pre-filtered transaction list.

### Data Model

Update `src/types.ts`:

- Add `TransactionReportingClass`
- Add optional `reportingClass`
- Add optional `reportingNote`

Update model normalization so restored or legacy transactions default cleanly.

### UI

Likely affected surfaces:

- Add/edit transaction form
- Quick edit transaction dialog
- History transaction rows
- Insights page
- Compare page
- Year review page
- Budget analysis page
- Dashboard safe-to-spend and monthly overview

### Tests

Minimum useful coverage:

- Existing transactions without `reportingClass` are treated as regular.
- Actual totals include all transactions.
- Normalized totals exclude extra transactions.
- Extra-only totals include only extra transactions.
- Category spending preserves original categories under all lenses.
- Budget calculations behave according to the confirmed decision.
- Import/restore normalization preserves or defaults reporting metadata.
- Recurring-generated transactions are treated as regular and cannot be marked as extra through recurring template generation.

## Privacy, Security, And Operations Impact

Privacy:

- The marker adds meaning to an existing transaction. It may reveal that a financial event was exceptional, but it does not introduce a new data category beyond local financial metadata.
- No new data transfer is required.
- Existing encrypted backup behavior should include the field if backup is enabled, because it is part of the local ledger.

Security:

- No new auth, admin, or permission surface.
- Admin must not gain visibility into these markers, consistent with the current admin allowlist-only model.

Operations and cost:

- No backend cost.
- No provider cost.
- Computation remains local and in-memory.

## Open Risks

- If the app defaults too aggressively to normalized views, users may forget that actual cash left their account.
- If budgets exclude extras without a visible actual impact, users may under-plan cashflow.
- If `Extra` is implemented as a category instead of metadata, reports lose category fidelity and later migration becomes harder.
- If each report page implements its own filtering, behavior will drift across Dashboard, Insights, Compare, and Year Review.

## Recommended MVP

1. Add transaction metadata: `reportingClass?: 'regular' | 'extra'`.
2. Add domain-level analytics lens helpers.
3. Add `Mark as extra` in add/edit and quick edit.
4. Add `Actual / Net of extras / Extras` segmented control to Insights first.
5. Show `Extras this period` as an explicit metric.
6. Extend Compare, Year Review, Dashboard, and Budgets with actual as the default and net-of-extras as the secondary comparison.
7. Preserve `reportingClass` and `reportingNote` in import/export.

## What Can Be Implemented Immediately

- Transaction metadata with safe default.
- Domain filtering helpers.
- Tests for actual, normalized, and extra-only totals.
- UI marker in transaction forms and history rows.
- Insights lens toggle.
- Budget progress that defaults to actual and shows net-of-extras as a secondary value.
- Import/export preservation for `reportingClass` and `reportingNote`.

## What Should Wait For Confirmation

- Final UI copy for the transaction toggle and report lenses.
- Whether `reportingNote` should be a free-text note only or later become structured reason tags.
- Exact CSV column names for the marker and note.
