# Aura Finance Color Hierarchy Progress Plan

## Purpose

This document tracks the implementation of the approved color hierarchy and page-composition refinement. It is the execution source of truth for this initiative and must be updated as each milestone progresses.

## Scope Freeze

The current application navigation remains unchanged:

```text
Home | Transactions | Add | Budgets | Reports
```

- `BottomNav.tsx`, `TopBar.tsx`, route aliases, keyboard shortcuts, and swipe destinations are out of scope.
- More remains a secondary area reached from the fixed TopBar action.
- Reports remains in the bottom navigation and must not be duplicated in More.
- Existing finance, recurring, persistence, backup, and privacy semantics remain unchanged.

## Visual Thesis

Aura uses a calm blue-grey canvas, crisp operational surfaces, and one Deep Ocean focal surface at most per screen so the most important financial answer is immediately recognizable.

## Content Plan

1. Focal answer: one inverse summary where the screen has a primary financial question.
2. Supporting context: neutral white cards or cardless grouped sections.
3. Detail: charts, lists, settings, and advanced controls on quiet standard surfaces.
4. Action: solid primary blue reserved for the selected control and next best action.

## Interaction Thesis

- Advanced transaction fields reveal through one accessible inline expansion.
- Report lens choices move into a focus-managed bottom sheet while the active lens remains visible on its trigger.
- Existing page and progress motion remains restrained and must continue to respect reduced-motion preferences.

## Approved Surface Rules

| Level | Treatment | Usage |
|---|---|---|
| Focal | Deep Ocean inverse surface | Maximum one per screen |
| Standard | White in light mode, neutral raised surface in dark mode | Forms, lists, charts, settings |
| Soft status | Low-opacity semantic wash | Insights, warnings, exceptional states |
| Action | Solid primary blue | Primary CTA and selected controls |

## Safe Defaults

- Home and Budgets retain a compact, always-visible Actual/Net control; its selected state must never be hidden.
- Reports retains Actual, Net of extras, and Extras only in View options; the selected lens remains visible in the trigger copy.
- Add Transaction keeps Extra/Refund visible beside the primary fields; payment method, notes, and attachment are closed for a new transaction and automatically open when editing non-default advanced values.
- Planning payment summaries count expense occurrences, not recurring templates or recurring income.
- Past planning months use scheduled language instead of implying that historical payments are upcoming.

## Progress Dashboard

Last updated: 2026-08-04

| Milestone | Status | Progress note |
|---|---|---|
| M0. Scope, plan, and baseline | Done | Clean baseline: typecheck and 202 tests pass |
| M1. Visual foundations | Done | Standard surfaces, focal primitive, and local selected tabs implemented |
| M2. Home and Budgets | Done | Compact visible Lens retained; focal summaries recomposed |
| M3. Transactions and Add | Done | Neutral list and protected progressive transaction form implemented |
| M4. Reports | Done | View options and one focal metric per report implemented |
| M5. Planning and More | Done | Upcoming summary and privacy-first service area implemented |
| M6. Regression and documentation | In progress | Automated gates pass; manual viewport/theme QA is blocked because no controllable browser is exposed in this session |

C1 reconciliation: implementation status remains unchanged. The 2026-08-04
baseline passes 482/482 Vitest tests and the production build; automated
responsive/theme cases pass, while physical/manual viewport, theme and rendered
reduced-motion evidence remains assigned to C4. See
[`c1-baseline-2026-08-04.md`](../07-qa/c1-baseline-2026-08-04.md).

## Milestones

### M0. Scope, Plan, And Baseline

- [x] Confirm that navigation is excluded.
- [x] Map affected pages, shared components, and existing tests.
- [x] Record visual, content, and interaction theses.
- [x] Record the pre-change automated baseline.
- [x] Confirm no uncommitted user changes overlap the implementation.

Exit criteria: scope is explicit, the repository baseline is understood, and navigation files remain untouched.

### M1. Visual Foundations

Files:

- `src/index.css`
- `src/components/ui/Card.tsx`
- `src/components/ui/FocalSummaryCard.tsx`
- `src/components/reports/ReportTabs.tsx`
- `src/components/planning/PlanningTabs.tsx`

Tasks:

- [x] Use `#f6f8fb` as the light canvas and pure white as the light standard-card surface.
- [x] Remove gradients, glow, and decorative wash from standard and elevated surfaces.
- [x] Keep inverse gradients and semantic inverse tones.
- [x] Add a compositional focal-summary wrapper without duplicating Card behavior.
- [x] Use solid primary blue for selected local report and planning tabs.
- [x] Preserve dark-mode separation, focus indicators, and semantic tokens.

### M2. Home And Budgets

Files:

- `src/pages/Dashboard.tsx`
- `src/pages/BudgetsPage.tsx`
- `src/components/RadialGauge.tsx`
- related page tests

Tasks:

- [x] Retain the compact Home and Budgets lens controls without competing with the focal metric.
- [x] Keep Available to Spend as Home's only inverse surface.
- [x] Turn useful Home insights into one soft-primary block.
- [x] Recompose the Budgets focal summary around spent, available, used, and remaining.
- [x] Remove technical extra detail from the Budgets focal surface.
- [x] Keep category rows neutral and use amber at 80-99%, red at 100%+.

### M3. Transactions And Add Transaction

Files:

- `src/pages/HistoryPage.tsx`
- `src/pages/AddTransaction.tsx`
- `src/components/history/TransactionHistoryList.tsx`
- `src/components/ui/AccordionSection.tsx`
- related component and page tests

Tasks:

- [x] Keep the transaction workspace neutral with soft active-filter chips.
- [x] Keep ordinary rows uncolored and confine category color to the icon.
- [x] Group Add Transaction around type, amount, title, category, and date.
- [x] Keep Extra/Refund visible and move only payment method, notes, and attachment into More options.
- [x] Auto-open advanced options when editing meaningful advanced values.
- [x] Use contextual Save/Update expense/income CTA copy.
- [x] Preserve validation, attachment, reporting, and recurring-override behavior.

### M4. Reports

Files:

- `src/pages/ReportsPage.tsx`
- `src/pages/InsightsPage.tsx`
- `src/pages/ComparePage.tsx`
- `src/pages/YearReviewPage.tsx`
- `src/components/compare/*`
- `src/components/year-review/*`
- related report tests

Tasks:

- [x] Move the full analytics lens into a View options bottom sheet.
- [x] Keep the selected lens visible on the trigger.
- [x] Give Overview, Categories, Compare, and Year one focal metric each.
- [x] Keep one primary chart and at most two primary insights per view.
- [x] Preserve deterministic calculations, empty states, and transaction drill-downs.
- [x] Keep the category donut supplementary outside mobile layouts.

### M5. Planning And More

Files:

- `src/pages/CalendarPage.tsx`
- `src/components/calendar/CalendarMonthSummary.tsx`
- `src/components/planning/PlanningSummaryCard.tsx`
- `src/domain/recurring.ts` when a shared pure selector is required
- `src/pages/MorePage.tsx`
- related tests

Tasks:

- [x] Replace the three Calendar summary tiles with one inverse upcoming/scheduled summary.
- [x] Show expense occurrence total, count, and next payment.
- [x] Add text-backed soft due-date status for three-day and seven-day thresholds.
- [x] Move the privacy callout to the top of More.
- [x] Keep Reports out of More and retain the existing TopBar entry.
- [x] Render dark mode as a normal settings row and preserve conditional install/Admin behavior.

### M6. Regression And Documentation

- [x] Update strategy, delivery, UX, visual-design, and progress documentation.
- [x] Update tests for lens controls and progressive disclosure.
- [x] Run `npm run lint`.
- [x] Run `npm run test`.
- [x] Run `npm run build`.
- [ ] Verify 320, 360, 390, 430, and 768 px layouts. (Blocked: no controllable browser is exposed in this session.)
- [ ] Verify light/dark and rendered reduced-motion behavior. (Blocked: no controllable browser is exposed in this session.)
- [x] Verify keyboard semantics, screen-reader labels, and explicit control states through component tests.
- [x] Confirm `BottomNav.tsx` and `TopBar.tsx` have no diff.

## Privacy, Security, AI, Observability, And Cost

- Personal data touched: existing local financial values rendered in the UI.
- New data collection, transfer, retention, export, or deletion behavior: none.
- New processor, subprocessor, provider, dependency, or usage-based cost: none.
- Authentication, authorization, backup encryption, and admin visibility: unchanged.
- AI or automated decision support: none.
- Existing error boundaries and user-visible recovery behavior must remain intact.

## Definition Of Done

The initiative is complete when every milestone task is checked, automated gates pass, visual and accessibility checks pass, documentation describes the implemented behavior, and the navigation files remain unchanged.
