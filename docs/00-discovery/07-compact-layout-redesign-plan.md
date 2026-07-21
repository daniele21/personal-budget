# Aura Finance Compact Layout Redesign Plan

> [!NOTE]
> Decision discovery is complete. The approved direction and task-level delivery status are tracked in [`08-ux-simplification-progress-plan.md`](./08-ux-simplification-progress-plan.md). The option analysis below remains as historical rationale and must not be treated as an open approval gate.

## Executive Assessment

The proposed layout direction is applicable and mostly aligned with the current product strategy.

It fits the documented positioning of Aura Finance as a local-first personal budgeting PWA focused on safe-to-spend, budgets, recurring payments, and local reporting. The strongest parts of the proposal are:

- making Safe to Spend the first decision point on the dashboard
- reducing visual noise through compact cards, grouped rows, accordions, and bottom sheets
- turning reports into layered analysis instead of chart-heavy dashboards
- consolidating recurring payments and calendar context
- keeping the product calm, financial, and mobile-first

This should not be implemented as a pixel-copy of the generated boards. The boards are useful as art direction and UX structure, but implementation should follow the existing Aura design system, accessible components, real data states, and local-first privacy constraints.

Recommended path: proceed incrementally, with a short decision gate first for navigation and detail-sheet behavior.

## Applicability To Current Codebase

### Already Available Foundations

The current repo already has most prerequisites:

- React 19, Vite, Tailwind 4, Motion, Recharts, Lucide icons
- semantic design tokens in `src/index.css`
- Aura brand assets in `brand-kit/`
- shared UI primitives in `src/components/ui/`
- `Card`, `Button`, `Input`, `Switch`, `EmptyState`, `Skeleton`, `LensSelector`
- `RadialGauge` and `Sparkline`
- bottom navigation and top bar shell
- quick-edit bottom sheets and focus trap support
- local-first finance calculations in `src/domain/finance.ts`
- existing pages for Dashboard, History, Budgets, Calendar, Recurring, Insights, Compare, and Year Review

### Main Gap

The gap is not data model capability. The gap is interaction architecture and visual hierarchy:

- `HistoryPage` is functionally strong but still reads as a history/search surface rather than a compact Transactions screen.
- `Dashboard` already has Safe to Spend, but Month Balance still competes as the first visual anchor.
- `BudgetsPage` uses a large gradient summary; the proposal asks for a calmer safe-to-spend and category-progress hierarchy.
- `CalendarPage` and `RecurringPage` overlap conceptually and should be consolidated through a segmented view.
- `InsightsPage` and `ComparePage` contain the right logic, but need the proposed report hierarchy: period selector, KPI cards, one primary chart, ranked breakdown, expandable insights.

## Decision Analysis (Resolved)

### 1. Bottom Navigation Information Architecture

What must be decided: which five items belong in the bottom nav.

Why it matters: this is hard to reverse after users learn the app. It also changes route naming, tests, and documentation.

Options:

- Option A: `Home`, `Transactions`, `Add`, `Budgets`, `More`
- Option B: `Home`, `Transactions`, `Add`, `Reports`, `More`
- Option C: keep current `Home`, `History`, `Add`, `Reports`, `Calendar`

Pros:

- Option A prioritizes the core budgeting job and matches the strongest proposal boards.
- Option B prioritizes analytics and keeps the current Reports entry visible.
- Option C is lowest effort and lowest user retraining cost.

Cons:

- Option A requires a new `More` surface and moves Reports/Calendar one level deeper.
- Option B leaves Budgets less prominent even though Safe to Spend depends on budgets.
- Option C preserves current terminology and clutter, so it does not fully deliver the proposed UX.

Resolution: use `Home | Transactions | Add | Budgets | Reports` in five equally spaced slots. Add remains a centered global action rather than a navigation destination; Reports remains directly reachable as the only full analytics area, while More moves to a fixed `…` action in every header.

### 2. Dashboard Primary Metric

What must be decided: whether Safe to Spend fully replaces Month Balance as the first dashboard card.

Why it matters: this changes the mental model of the product from accounting summary to spending decision support.

Options:

- Option A: Safe to Spend is primary; Month Balance becomes a compact secondary metric.
- Option B: keep Month Balance first and make Safe to Spend second.
- Option C: show both in one large combined card.

Pros:

- Option A matches the product brief and brand kit.
- Option B preserves current information order.
- Option C reduces route churn but risks a crowded hero card.

Cons:

- Option A requires careful explanatory affordance for the Safe to Spend calculation.
- Option B weakens the new layout direction.
- Option C can become visually dense and harder to scan.

Resolution: Option A is approved. Safe to Spend remains the primary Home metric, with Actual as the default and a minimal `Actual | Net` control.

### 3. Calendar And Recurring Consolidation

What must be decided: whether Calendar and Recurring become one screen with a segmented control.

Why it matters: the current app has both `/calendar` and `/recurring`; the proposal treats them as one planning area.

Options:

- Option A: merge into a single Planning screen with `Calendar` / `Recurring` segmented views.
- Option B: keep separate routes but redesign both with shared components.
- Option C: keep current structure and only polish cards.

Pros:

- Option A reduces navigation complexity and matches user intent: upcoming commitments.
- Option B has less routing risk.
- Option C is fastest.

Cons:

- Option A requires route handling and migration of entry points.
- Option B may keep duplicated logic alive.
- Option C misses a major part of the proposed layout.

Resolution: Option A is approved, while preserving `/calendar` and `/recurring` as deep links into the appropriate segment.

### 4. Transaction Row Tap Behavior

What must be decided: whether tapping a transaction opens read-only details first or the current edit sheet.

Why it matters: the proposal favors progressive disclosure: inspect first, edit only when requested.

Options:

- Option A: row tap opens `TransactionDetailSheet`; edit is an explicit action inside the sheet.
- Option B: keep current quick-edit behavior.
- Option C: row tap opens details on reports only, but quick edit in Transactions.

Pros:

- Option A best matches the proposal and reduces accidental edits.
- Option B is lowest effort.
- Option C preserves speed in high-frequency transaction workflows.

Cons:

- Option A adds one more tap for editing.
- Option B keeps detail and edit responsibilities mixed.
- Option C may feel inconsistent.

Resolution: keep the current details-first behavior, with edit as an explicit action and swipe-to-edit retained where already supported.

## Safe Assumptions

These can be defaulted safely unless product direction changes:

- No new backend, AI provider, banking integration, or external processor is needed.
- No data model migration is required for the first redesign slice.
- Financial data remains local unless the existing encrypted cloud backup is explicitly enabled.
- App copy remains English for now, because current UI and proposal boards are English.
- Existing brand colors and typography stay canonical: Deep Ocean Blue, Forest Green, Amber, Aura Cyan, Manrope, and Inter.
- Existing domain functions remain the source of truth; UI components should consume derived values rather than duplicate calculations.

## Implementation Strategy

Use a component-first redesign, not page-by-page restyling.

The main structural rule: extract reusable compact primitives first, then rebuild each screen with those primitives. This avoids further growth of already-large pages and keeps visual behavior consistent.

## Proposed Implementation Slices

### Slice 0: Approval And Documentation Gate

Goal: lock the high-impact UX decisions before implementation.

Tasks:

- Confirm bottom navigation target.
- Confirm Safe to Spend as dashboard primary.
- Confirm Calendar/Recurring consolidation.
- Confirm transaction detail sheet behavior.
- Update `docs/00-discovery/01-solution-strategy.md` once decisions are approved.
- Update `docs/00-discovery/02-delivery-plan.md` with the chosen redesign slices.

Done when:

- no foundational UX decision remains open
- implementation can proceed without route or IA ambiguity

### Slice 1: Shared UI Primitives

Goal: create the small set of reusable components needed by all redesigned screens.

Files to add or update:

- `src/components/ui/SegmentedControl.tsx`
- `src/components/ui/AccordionSection.tsx`
- `src/components/ui/BottomSheet.tsx`
- `src/components/ui/CompactMetricCard.tsx`
- `src/components/ui/ProgressRow.tsx`
- `src/components/ui/IconAction.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/index.ts`
- `src/index.css`

Changes:

- Generalize segmented controls beyond `LensSelector`.
- Standardize accordion headers with label, count, chevron, and optional status dot.
- Extract common bottom-sheet shell from current filter, edit, budget, and recurring dialogs.
- Add compact KPI card for label, amount, delta, icon, and semantic color.
- Add progress row for budget/category lists with amount, limit, percentage, and threshold color.
- Keep radius, spacing, color, and shadows aligned with current Aura tokens.
- Avoid hardcoded hex values in components.

Tests:

- component render tests for segmented selection, accordion expand/collapse, and bottom sheet close behavior
- accessibility checks for labels, `aria-expanded`, `role="dialog"`, Escape close, and focus trap

### Slice 2: Navigation And App Shell

Goal: align route naming and navigation with the compact product model.

Files to update:

- `src/App.tsx`
- `src/components/BottomNav.tsx`
- `src/components/TopBar.tsx`
- `src/components/Layout.tsx`
- add `src/pages/MorePage.tsx` if Option A is approved

Changes:

- Rename visible `History` label to `Transactions`.
- Add `/transactions` as the canonical route, with `/history` retained as a backward-compatible alias if needed.
- Add `More` page if approved, grouping Reports, Calendar/Recurring, Profile, Year Review, Import, and Admin.
- Tune TopBar titles to match screen context without extra decorative copy.
- Keep central Add button prominent and accessible.
- Ensure bottom nav labels fit on narrow mobile widths.

Tests:

- route render tests for main tabs
- active nav state tests
- keyboard shortcut smoke tests
- mobile-width visual check for label clipping

### Slice 3: Dashboard Redesign

Goal: make the dashboard answer "Can I safely spend today?" in the first viewport.

Files to update or add:

- `src/pages/Dashboard.tsx`
- add `src/components/dashboard/SafeToSpendCard.tsx`
- add `src/components/dashboard/MonthlyOverviewCards.tsx`
- add `src/components/dashboard/QuickActions.tsx`
- add `src/components/dashboard/CollapsedSummarySection.tsx`
- add `src/components/dashboard/CashFlowPreview.tsx`

Changes:

- Promote Safe to Spend to the first card.
- Move Month Balance into overview cards or a compact secondary summary.
- Show three compact metrics: Income, Spent, Remaining.
- Add quick actions: Add transaction, Plan budget, Analyze spending, Transfer/adjust money if supported by current domain behavior.
- Collapse secondary sections by default: upcoming reminders, accounts, possibly recent activity.
- Keep one primary chart only: cash-flow preview or spending category preview, not both at the same level.
- Link deeper analysis to Reports instead of expanding the dashboard into a full analytics page.

Important constraint:

- Do not duplicate finance calculations in UI components. Continue using `src/domain/finance.ts` and `useApp()` derived data.

Tests:

- update `src/pages/__tests__/Dashboard.test.tsx`
- verify Safe to Spend calculation display
- verify empty state with no transactions
- verify lens behavior still affects values
- verify quick action links

### Slice 4: Transactions Screen

Goal: convert History into the compact Transactions experience shown in the proposal.

Files to update or add:

- `src/pages/HistoryPage.tsx`
- `src/components/history/TransactionHistoryList.tsx`
- add `src/components/transactions/TransactionGroup.tsx`
- add `src/components/transactions/TransactionRow.tsx`
- add `src/components/transactions/TransactionDetailSheet.tsx`
- add `src/components/transactions/TransactionFiltersSheet.tsx`
- add `src/domain/transactionGrouping.ts` if grouping logic becomes non-trivial

Changes:

- Add segmented control: `All`, `Income`, `Expenses`.
- Group transactions by date with a group total.
- Keep search and filter available, but secondary to the list.
- Row default should show category icon, title, category, amount, and concise date/time.
- Move full details to `TransactionDetailSheet`.
- Keep edit, delete, duplicate, split, and attachment behavior as explicit actions where supported.
- Preserve import workflow, but move it to a secondary action or More if the approved nav uses More.

Architecture note:

- Extract grouping and filtering logic so `HistoryPage.tsx` does not grow further.

Tests:

- update `src/components/history/__tests__/TransactionHistoryList.test.tsx`
- add grouping tests for same-day totals and income/expense filters
- add detail sheet interaction tests
- regression test delete undo and quick edit save

### Slice 5: Budgets And Safe-To-Spend

Goal: make budgets show progress and risk at a glance.

Files to update or add:

- `src/pages/BudgetsPage.tsx`
- add `src/components/budgets/BudgetSafeToSpendSummary.tsx`
- add `src/components/budgets/BudgetProgressList.tsx`
- add `src/components/budgets/BudgetAlertList.tsx`
- add `src/components/budgets/BudgetCategoryDetailSheet.tsx`

Changes:

- Replace the large gradient summary with a compact Safe to Spend summary using the same visual language as Dashboard.
- Show category budget rows with icon, amount, limit, percentage, progress bar, and semantic color.
- Use thresholds:
  - 0-70% safe
  - 70-90% attention
  - 90-100% warning
  - 100%+ over budget
- Convert category taps into a detail bottom sheet instead of immediately opening the edit form.
- Keep budget edit available as an explicit sheet action.
- Add compact alerts for categories near or over budget.

Tests:

- update `src/pages/__tests__/BudgetsPage.test.tsx`
- verify threshold colors through accessible labels or text states
- verify add/edit/delete budget workflows still work
- verify extra/normalized values do not regress

### Slice 6: Calendar And Recurring Planning

Goal: combine upcoming commitments into a segmented planning surface.

Files to update or add:

- `src/pages/CalendarPage.tsx`
- `src/pages/RecurringPage.tsx`
- `src/components/calendar/CalendarGrid.tsx`
- `src/components/calendar/CalendarMonthSummary.tsx`
- `src/components/RecurringEntryCard.tsx`
- add `src/components/planning/PlanningSegmentedView.tsx`
- add `src/components/planning/UpcomingPaymentsList.tsx`
- add `src/components/planning/RecurringFrequencyAccordion.tsx`
- add `src/components/planning/RecurringDetailSheet.tsx`

Changes:

- Add `Calendar` / `Recurring` segmented control.
- Use compact calendar strip or compact month grid depending on approved scope.
- Show upcoming payments grouped by date.
- Group recurring entries by frequency in collapsed sections.
- Move recurring detail into a bottom sheet with manage action.
- Preserve existing recurring override behavior for single occurrences.
- Preserve local notification settings and reminder copy.

Tests:

- calendar selected-day tests
- recurring frequency grouping tests
- recurring edit/delete/undo regression tests
- reminder setting regression tests

### Slice 7: Reports, Insights, Compare, And Trends

Goal: bring Reports in line with the proposal: summary first, one chart per screen, drill-down only when useful.

Files to update or add:

- `src/pages/InsightsPage.tsx`
- `src/pages/ComparePage.tsx`
- `src/components/compare/*`
- add `src/components/reports/ReportKpiGrid.tsx`
- add `src/components/reports/SpendingByCategoryReport.tsx`
- add `src/components/reports/ExpandableInsightList.tsx`
- add `src/components/reports/LinkedTransactionsList.tsx`

Changes:

- Put period selector first.
- Use compact KPI cards for Income, Expenses, Net Cash Flow, and Safe to Spend when available for the selected period.
- Keep one primary visualization per view.
- Use ranked category lists connected directly to charts.
- Use expandable insights for explanations.
- Keep Compare as a focused drill-down view, but restyle summary cards and category deltas to match the compact proposal.
- Avoid AI-like generic copy; all insights should be deterministic and traceable to local data.

Tests:

- update `src/pages/__tests__/InsightsPage.test.tsx`
- add Compare visual hierarchy smoke tests
- verify deterministic insights for increased/decreased categories
- verify empty states for no transactions in period

### Slice 8: Visual Polish And Theme Parity

Goal: make the redesign feel coherent across light/dark, mobile/tablet, and PWA contexts.

Files to update:

- `src/index.css`
- `src/config/categoryThemes.ts`
- `src/components/BrandMark.tsx`
- `public/manifest.json` only if navigation or icon names require copy updates
- `public/sw.js` only if navigation notification click targets change

Changes:

- Use tabular numbers for financial values.
- Audit font weights: hero metrics 800, section titles 700, row labels 600, captions 400-500.
- Ensure category colors stay semantic, not decorative.
- Reduce red usage to real overspend/problem states.
- Verify dark mode containers maintain separation.
- Confirm text never overlaps in compact cards and bottom nav.

Tests:

- manual visual QA at 375px, 390px, 430px, 768px, and desktop shell width
- light/dark screenshots
- reduced motion check
- touch target check for 44px minimum on primary controls

### Slice 9: Documentation And Release Readiness

Goal: keep operational documentation aligned with the actual redesign.

Files to update after implementation:

- `docs/00-discovery/01-solution-strategy.md`
- `docs/00-discovery/02-delivery-plan.md`
- `docs/00-discovery/04-ux-analysis.md`
- `docs/00-discovery/05-visual-design-analysis.md`
- `docs/testing-strategy.md` if test strategy changes
- `docs/04-privacy-gdpr/privacy-notes.md` only if behavior changes beyond local UI processing
- `CHANGELOG.md` if introduced

Required checks:

- `npm run lint`
- `npm run test`
- `npm run build`
- targeted React component tests for modified pages
- visual QA screenshots for core mobile viewports

## File-Level Change Matrix

| Area | Files | Change Type |
|---|---|---|
| Design primitives | `src/components/ui/*`, `src/index.css` | Add reusable compact controls and sheet primitives |
| Shell/navigation | `src/App.tsx`, `src/components/Layout.tsx`, `src/components/TopBar.tsx`, `src/components/BottomNav.tsx` | Route labels, nav items, More page, spacing |
| Dashboard | `src/pages/Dashboard.tsx`, `src/components/dashboard/*` | Recompose hierarchy around Safe to Spend |
| Transactions | `src/pages/HistoryPage.tsx`, `src/components/history/*`, `src/components/transactions/*` | Rename/restructure into grouped Transactions view |
| Budgets | `src/pages/BudgetsPage.tsx`, `src/components/budgets/*` | Compact safe-to-spend summary, progress rows, alerts |
| Planning | `src/pages/CalendarPage.tsx`, `src/pages/RecurringPage.tsx`, `src/components/calendar/*`, `src/components/planning/*` | Segment Calendar/Recurring, group upcoming and frequency views |
| Reports | `src/pages/InsightsPage.tsx`, `src/pages/ComparePage.tsx`, `src/components/compare/*`, `src/components/reports/*` | KPI-first reports, one chart per view, expandable insights |
| Tests | `src/pages/__tests__/*`, `src/components/**/__tests__/*`, domain tests if grouping extracted | Regression and interaction coverage |
| Docs | `docs/00-discovery/*`, `docs/04-privacy-gdpr/privacy-notes.md` if needed | Align strategy, delivery, UX, visual docs |

## Risks And Mitigations

### Risk: Static mockup overfit

The proposal images include idealized examples and explanatory callouts. The app should not ship callout text or decorative board elements.

Mitigation: use the images as hierarchy reference, not literal UI.

### Risk: Page components grow again

Several pages are already large, especially `CalendarPage.tsx`, `HistoryPage.tsx`, and `InsightsPage.tsx`.

Mitigation: each slice must extract components before adding new behavior.

### Risk: Navigation churn

Changing bottom nav labels and destinations affects user muscle memory.

Mitigation: keep aliases and redirects, and preserve route compatibility where practical.

### Risk: Hidden essential information

Progressive disclosure can hide important budget warnings if applied too aggressively.

Mitigation: errors, overspend, due reminders, and required actions must remain visible without expansion.

### Risk: Compact UI harms accessibility

Dense layouts can reduce readability and tap accuracy.

Mitigation: keep body text at readable sizes, preserve minimum tap targets, use semantic labels, and test with narrow mobile widths.

## Privacy, Security, Observability, And Cost Impact

Expected impact is low if the redesign stays UI-only.

- Personal financial data touched: existing local transactions, budgets, recurring entries, reminders, and reports.
- New data collection: none.
- New vendor/subprocessor: none.
- Data transfer change: none.
- Retention/deletion/export impact: none expected.
- Admin visibility impact: none.
- AI governance impact: none; no AI is introduced.
- Cost impact: none expected; no new provider or backend workflow.
- Observability impact: no production telemetry exists in the current local-first app; no new instrumentation is required for the UI-only redesign.

If future implementation adds analytics tracking, remote sync behavior, AI insights, or backend reporting, privacy and GDPR documentation must be revisited before release.

## Recommended Delivery Order

The approved order now lives in [`08-ux-simplification-progress-plan.md`](./08-ux-simplification-progress-plan.md). Its dependency-aware milestones replace this proposal sequence for execution and progress reporting.

## Immediate Next Step

Use [`08-ux-simplification-progress-plan.md`](./08-ux-simplification-progress-plan.md) as the implementation tracker. Complete its M0 baseline screenshots and regression-test map before starting shared components or route changes.
