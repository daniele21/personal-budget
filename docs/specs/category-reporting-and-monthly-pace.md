# Category Reporting And Calendar-Month Spending Pace

- Status: Implemented and verified
- Decision date: 2026-07-29
- Implementation date: 2026-07-29
- Applies to: hosted PWA and bundled Android Capacitor application

## Purpose

Aura will make category reports useful for longitudinal analysis and will align
Spending Pace with the calendar-month cadence of common personal expenses.
Every calculation remains deterministic, local-only, and derived from the
canonical transaction ledger.

## Shared Definitions

### Analytics Lens

All category and pace calculations apply the active Reports lens first:

- `actual`: every transaction;
- `normalized`: every transaction except those classified as `extra`;
- `extras`: only transactions classified as `extra`.

Recurring transactions retain the existing reporting-class invariant.
Reimbursements use the existing canonical treatment: they are not income for
reporting and reduce reportable expense. A displayed expense amount must not be
negative.

### Calendar Month

A calendar month begins at local `00:00:00.000` on its first day and ends at
local `23:59:59.999` on its final day.

A month is complete for an average only when:

- the selected range includes that entire calendar month; and
- the month ends before the current local calendar month.

The current month is always partial until it ends. A custom range that starts
after the first day or ends before the final day makes that boundary month
partial.

### Eligible Ledger History

Months before the earliest transaction in the active lens are not treated as
observed zero-spend history. Complete months at or after the earliest ledger
month with no reportable expense are valid zero months.

## Category Ranking

For each category in the selected range:

- `selectedTotal` is the existing net reportable expense inside the complete
  selected date range, including partial months;
- `share` is the category's selected total divided by the total reportable
  category spend for the same range;
- `completeMonthCount` is the number of fully enclosed completed calendar
  months;
- `monthlyAverage` is the category's net reportable expense across those
  complete months divided by `completeMonthCount`.

The row shows `monthlyAverage` only when `completeMonthCount >= 2`. The row must
name the denominator, for example `€320/month · 2 complete months`.

Rows remain ordered by selected-period total. The average does not change the
ranking.

## Category Detail

Selecting a ranked category opens a canonical Reports detail route. The route
preserves:

- encoded category name;
- range preset or custom start/end dates;
- active analytics lens.

The Categories report and a category detail opened without an explicit period
default to the `12M` preset. A period already selected by the user remains
authoritative when navigating to the detail.

The detail contains:

1. category identity and back navigation;
2. selected-period total;
3. monthly average and complete-month denominator when available;
4. a calendar-month plot;
5. the five highest-impact transactions;
6. a link to the full filtered transaction history.

### Monthly Plot

- The x-axis uses calendar months.
- Every touched month receives one point.
- Months without reportable category expense receive zero.
- A boundary or current incomplete month is visibly marked `Partial`.
- The chart does not project, extrapolate, or annualize a partial month.
- A one-month range is valid and produces one point; it may include guidance to
  select a longer range but must not silently change scope.

### Top Transactions

The preview includes transactions matching category, selected range, and
analytics lens.

- Rank by absolute financial impact descending.
- Break ties by transaction date descending.
- Include reimbursements because they explain reductions in category spending.
- Limit the preview to five.
- Reuse the existing transaction-detail interaction where practical.

## Spending Pace

Spending Pace has one underlying monthly baseline.

For the latest `N` eligible complete calendar months, where `1 <= N <= 3`:

```text
monthlyPace = sum(monthExpense[1..N]) / N
dailyEquivalent = monthlyPace * 12 / 365.2425
weeklyEquivalent = dailyEquivalent * 7
```

`monthExpense` uses the active analytics lens and canonical reimbursement
treatment. The UI always states `N`; if no eligible complete month exists, it
shows an insufficient-history state instead of zero.

### Pace Summary

- Monthly pace is primary.
- Weekly and daily equivalents are secondary and explicitly described as
  equivalents of the monthly baseline.
- The three values must reconcile using the formulas above.

### Pace Trend

The detail chart shows, by complete calendar month:

- actual net reportable expense;
- moving monthly pace calculated from up to that month and its two preceding
  eligible complete months.

The former Day/Week/Month trend selector is removed because the values are unit
conversions of one baseline rather than independent trends.

For standard presets, the pace history ends on the last day of the previous
month. For custom ranges, only fully enclosed complete calendar months appear.

## Empty, Partial, And Error States

- No category transactions in range: show a category-specific empty state and
  preserve period/lens controls.
- Fewer than two complete months: omit the category average and explain that
  more complete history is needed.
- No complete month for pace: show insufficient history.
- Missing or renamed category route: show a safe not-found state with a return
  action; do not modify categories or transactions.
- Invalid custom range: retain the existing valid-by-construction control and
  defensive normalization.

## Accessibility And Responsive Behavior

- Category rows and chart drill-downs are keyboard reachable and have explicit
  accessible names.
- Chart values and partial-month state are available as text, not only through
  hover or color.
- Tooltip interaction supports pointer and keyboard/touch alternatives.
- Layout must work at 320, 360, 390, and 430 px and in light/dark themes.
- Reduced-motion preferences remain respected.

## Architecture And Data

- Place aggregation in pure reporting-domain functions.
- Build month/category maps in bounded passes over the ledger.
- Reuse the existing Recharts dependency and shared report/category components.
- Do not add a persisted field, storage key, migration, backend, native Android
  financial calculation, remote telemetry, provider, or AI workflow.

## Verification

Implementation verification completed on 2026-07-29:

- all shared TypeScript checks, Vitest regressions, and the production web build
  pass through `npm run test:regression`;
- the Android debug unit-test task, bundled debug APK build, and all 34 API 36
  instrumentation tests pass;
- the category list, category detail, filtered-history link, partial-month
  treatment, and insufficient-history pace state were exercised in the real
  browser at 390 px;
- the category detail was additionally checked at 320 px with no horizontal
  overflow;
- component and domain regressions provide populated-chart, lens,
  reimbursement, archived-category, sparse-history, leap-year, and custom-range
  coverage without depending on mutable browser fixtures.

Required domain cases:

- month and year boundaries;
- leap-year February;
- local-time boundary transactions;
- zero-spend months;
- current and custom partial months;
- one, two, three, and more than three months of history;
- reimbursements greater than expense within a bucket;
- Actual, normalized, and extras lenses;
- archived category references;
- transaction ranking and tie-breaking.

Required integration cases:

- category row to detail to filtered history;
- refresh and browser back/forward with preserved scope;
- report lens changes;
- missing category route;
- web/PWA and Android bundled-WebView navigation;
- narrow viewport, keyboard, screen-reader text, reduced motion, and themes.

## Privacy, Security, AI, And Cost

The feature derives views from existing local financial data. It adds no new
processing purpose, collection, retention, deletion, export, transfer,
subprocessor, administrator access, or network path. It does not use AI or
provide automated financial advice. It adds no usage-based service cost, so an
admin cost panel is not required.
