# Aura Finance UX Simplification Progress Plan

## Purpose

This document is the living delivery tracker for the approved information-architecture and UX simplification work.

It records:

- approved product decisions;
- implementation order and dependencies;
- task-level progress;
- quality, accessibility, privacy, and documentation gates;
- risks, blockers, and deferred work.

Update this file whenever a task starts, completes, becomes blocked, or changes scope. The design rationale remains in `07-compact-layout-redesign-plan.md`; this file is the execution source of truth.

## Status Legend

| Status | Meaning |
|---|---|
| `Not started` | No implementation work has begun |
| `In progress` | Work is actively underway |
| `Blocked` | Progress requires a decision or external change |
| `Done` | Code, tests, visual verification, and required docs are complete |

For task lists:

- `[ ]` not completed;
- `[x]` completed.

## Progress Dashboard

Last updated: 2026-07-21

| Milestone | Status | Progress note |
|---|---|---|
| M0. Decisions, documentation, and baseline | Blocked | Product decisions approved; baseline capture awaits an available browser session |
| M1. Shared UX and visual foundations | In progress | Shared lens control and session state implemented; remaining visual primitives stay open |
| M2. Navigation, routes, and shell | In progress | Routes, shell, aliases, and automated tests implemented; narrow-width visual QA remains open |
| M3. Unified Reports | In progress | Shared route-aware report shell, canonical views, and session-scoped three-state lens implemented; content reduction remains open |
| M4. Unified Planning | In progress | Functional implementation and automated coverage complete; narrow-width and light/dark visual verification remains open |
| M5. Transactions simplification | In progress | Primary controls simplified; combined Filters/Sort and Import relocation implemented; operational regression coverage remains open |
| M6. Add Transaction simplification | Done | Decision superseded: optional fields now use accessible progressive disclosure with edit-state protection |
| M7. Home and Budgets simplification | In progress | Functional UI and regression coverage complete; visual viewport/theme verification remains open |
| M8. More and visual-system reduction | In progress | More inventory and neutral shared surfaces implemented; visual comparison and theme verification remain open |
| M9. Regression, release, and documentation sync | In progress | Automated quality gate and documentation sync complete; manual visual/accessibility release checks remain open |

Current delivery focus: **M1–M3**. M0 visual baseline capture remains blocked by the unavailable browser and must be completed before these milestones are marked Done.

## Approved Decisions

### Navigation

Approved primary navigation:

```text
Home | Transactions | Add | Budgets | Reports
```

`Add` is a global action rather than a destination. The shell therefore has four navigation destinations plus one visually prominent transaction action in five equal-width slots. More remains available as a secondary area from a fixed `…` action in every header; the account avatar opens Profile.

Constraints:

- `Add` remains icon-only with an accessible label;
- `Add` occupies the exact geometric center of the bar and every shell item uses the same horizontal spacing;
- active navigation uses one restrained indicator without combined glow, gradient, and shadow effects;
- the `…` action linking to More remains fixed and visible in every header variant;
- the layout must work without clipping or horizontal scrolling at 320 px and 360 px widths;
- `/transactions` remains canonical and `/history` remains a compatibility alias;
- route aliases and deep links must be preserved where practical.

### Unified Analytics

`Reports` is the only full analytics area:

```text
Reports

Overview | Categories | Compare | Year
```

The existing Insights logic is retained and recomposed. `/insights`, `/compare`, and `/year-review` must remain valid as aliases or deep links to the appropriate report view.

### Unified Planning

Calendar and recurring management become one area:

```text
Planning

Calendar | Recurring
```

The two views share one recurring-entry form and common orchestration. `/calendar` and `/recurring` remain valid deep links to the corresponding view.

### Analytics Lens

- The default view is always `Actual`.
- Home and Budgets expose a minimal two-state control: `Actual | Net`.
- Reports exposes the complete control: `Actual | Net of extras | Extras only`.
- The compact control must always communicate the active state.
- When `Net` is active, the UI must explain that extras are excluded.
- The Home/Budgets choice may be shared for the current app session, but must not silently persist across new sessions.
- Domain finance functions remain the source of truth for lens filtering and totals.

### Interaction And Visual Principles

- Home orients; Reports analyzes.
- Transactions prioritizes finding and operating on transactions.
- Advanced and occasional fields use progressive disclosure.
- Each screen may have at most one inverse focal surface.
- Standard cards remain neutral and avoid decorative gradient borders, halo, blur, and multilayer shadows.
- Red is reserved for negative or over-limit conditions.
- Loading, empty, error, and success states remain explicit.
- Existing accessibility behavior, keyboard support, focus trapping, reduced motion, and undo flows must not regress.

## Scope

### In Scope

- information architecture and route composition;
- navigation and shell behavior;
- Reports consolidation;
- Calendar/Recurring consolidation;
- Home, Transactions, Add Transaction, Budgets, and More simplification;
- analytics-lens presentation and session behavior;
- shared component extraction where it reduces page duplication;
- visual-system reduction and theme parity;
- regression tests, visual QA, and documentation sync.

### Out Of Scope

- changes to financial calculation rules;
- new backend services or remote analytics;
- AI insights or automated financial advice;
- bank aggregation or open-banking integrations;
- changes to encrypted cloud-backup semantics;
- admin access to personal financial data;
- unrelated category or storage-model migrations.

## Delivery Principles

- Deliver the work incrementally; do not rewrite every page in one change.
- Extract shared behavior before adding more logic to large page components.
- Preserve canonical finance and recurring logic in the domain layer.
- Keep old routes as aliases until all internal links and tests use the canonical routes.
- A milestone is not `Done` until its tests, accessibility checks, and relevant documentation are complete.
- Do not defer visual QA until the final milestone; verify each changed surface at narrow mobile widths as it lands.

## Milestone Plan

### M0. Decisions, Documentation, And Baseline

Goal: create an approved, verifiable baseline before implementation.

Status: **Blocked**

Tasks:

- [x] Analyze the current UI feedback against repository code and product documents.
- [x] Approve the five-slot shell model with four destinations plus the centered Add action.
- [x] Approve Reports as the only full analytics area.
- [x] Approve Planning as the unified Calendar/Recurring area.
- [x] Approve Actual as default with a minimal Home/Budgets lens control.
- [x] Create this progress tracker.
- [x] Record the approved UX direction in the solution strategy.
- [x] Point the main delivery plan to this tracker.
- [ ] Capture baseline screenshots for Home, Transactions, Add, Budgets, Insights, Reports, More, Calendar, and Recurring.
- [ ] Record the baseline at 320 px, 360 px, 390 px, 430 px, 768 px, and the supported desktop shell width.
- [x] Confirm the existing test inventory and map each affected flow to a regression test.

Exit criteria:

- approved decisions are documented;
- baseline evidence exists;
- affected routes, components, and tests are mapped;
- no foundational UX decision remains open.

Existing regression-test map:

| Area | Existing coverage | Required additions |
|---|---|---|
| Domain finance and lenses | `src/domain/__tests__/finance.test.ts` | Add cases only if lens orchestration changes domain behavior |
| Recurring domain behavior | `src/domain/__tests__/recurring.test.ts`, `recurringConsistency.test.ts` | Preserve reconciliation, override, and occurrence invariants |
| Home | `src/pages/__tests__/Dashboard.test.tsx` | Compact lens, report link, Cash Flow preview, and simplified hierarchy |
| Budgets | `src/pages/__tests__/BudgetsPage.test.tsx` | Compact lens, category hierarchy, alerts, and simplified hero |
| Current Insights | `src/pages/__tests__/InsightsPage.test.tsx` | Migrate coverage to unified Reports views and aliases |
| Transaction list | `src/components/history/__tests__/TransactionHistoryList.test.tsx` | Combined filter/sort sheet, default metadata, import relocation, and route behavior |
| Transaction quick edit | `src/components/__tests__/TransactionQuickEditDialog.test.tsx` | Preserve quick-edit behavior after Transactions simplification |
| Navigation and routes | No dedicated coverage | Add BottomNav, TopBar, canonical route, alias, and active-state tests |
| Add Transaction | No dedicated page coverage | Add progressive-disclosure, CTA, validation, and reporting-treatment tests |
| Planning pages | No dedicated page coverage | Add tab routing, shared form, CRUD, reminder, override, and undo tests |
| Compare and Year views | No dedicated page coverage | Add unified Reports view, direct-link, lens, and empty-state tests |
| More | No dedicated page coverage | Add allowed entries, conditional install surface, and admin visibility tests |

### M1. Shared UX And Visual Foundations

Goal: establish the reusable primitives and styling rules needed by later milestones.

Status: **In progress**

Dependencies: M0.

Tasks:

- [x] Define a shared compact lens control with accessible `Actual` and `Net` states.
- [x] Define the full Reports lens selector with `Actual`, `Net of extras`, and `Extras only`.
- [x] Place session lens state in `PreferencesProvider` and expose it through the compatibility app context without persisting it.
- [x] Keep the full Reports lens in separate session state so its three states survive report-view navigation without affecting Home or Budgets.
- [ ] Add or refine shared report tabs and route-aware segmented navigation.
- [ ] Consolidate reusable bottom-sheet structure for filters and advanced options.
- [x] Confirm and retain the existing shared compact progress row for category budgets.
- [ ] Make standard cards visually neutral by default.
- [ ] Reserve inverse and elevated variants for explicitly approved focal surfaces.
- [ ] Remove hardcoded decorative colors in changed components.
- [x] Add component tests for lens labels and selected state; keyboard, focus, and Escape coverage remains attached to the bottom-sheet consolidation task.

Exit criteria:

- later pages can use shared controls without duplicating state or styling logic;
- light/dark parity is verified;
- controls remain operable by keyboard and assistive technology.

### M2. Navigation, Routes, And Shell

Goal: implement the approved information architecture and remove shell-level dead or duplicate actions.

Status: **In progress**

Dependencies: M1 shared navigation primitives.

Tasks:

- [x] Update BottomNav to `Home | Transactions | Add | Budgets | Reports` with equal-width slots.
- [x] Treat Add as an action with an icon-only accessible label.
- [x] Implement a single minimal active-state treatment.
- [ ] Verify nav labels at 320 px and 360 px without truncation or overlap.
- [x] Add canonical `/reports` route and preserve report-related aliases/deep links.
- [x] Add canonical `/planning` route and preserve `/calendar` and `/recurring` deep links.
- [x] Keep `/transactions` canonical and `/history` as a compatibility alias.
- [x] Remove the non-functional Reports `More options` button.
- [x] Hide global TopBar search on Transactions while retaining local transaction search.
- [x] Update route titles, active-route aliases, keyboard shortcuts, swipe destinations, and internal links.
- [x] Add route, TopBar, lens, and active-navigation regression tests.

Exit criteria:

- every primary destination is directly reachable;
- legacy links still resolve correctly;
- no shell action appears interactive without performing an action;
- narrow-width and keyboard navigation checks pass.

### M3. Unified Reports

Goal: replace Insights/Compare/Year fragmentation with one layered analytics area.

Status: **In progress**

Dependencies: M1 and M2.

Tasks:

- [x] Create route-aware `Overview | Categories | Compare | Year` report views.
- [x] Recompose the existing Insights calculations as Reports Overview without changing domain behavior.
- [x] Keep the highest-signal Reports Overview KPI summary (Income, Expenses, Net Cash Flow) and remove the duplicated operational Safe to Spend KPI.
- [x] Keep at most two deterministic comparison insights and make both source periods explicit.
- [x] Remove Financial Trajectory from Transactions after retaining the primary cash-flow trajectory in Reports Overview.
- [x] Simplify Compare to period, shared lens, report view, and relevant drill-down only.
- [x] Move merchant comparison behind a secondary drill-down.
- [x] Use the ranked category list with period total as the primary mobile category visualization.
- [x] Defer the category donut to tablet and larger layouts where it can supplement rather than duplicate the ranking.
- [x] Integrate Year in Review as the Year view.
- [x] Preserve explicit empty states for Overview, Categories, and period comparisons without data.
- [x] Preserve direct links from report categories to filtered transactions.
- [x] Add regression tests for periods, lenses, deterministic insights, aliases, drill-downs, and empty states.

Exit criteria:

- Reports is the only full analytics destination;
- Insights, Compare, and Year logic remains accessible without duplicated top-level screens;
- each view has a clear primary question and no redundant control stack.

### M4. Unified Planning

Goal: combine Calendar and Recurring around one planning workflow and one recurring form.

Status: **In progress**

Dependencies: M1 and M2.

Tasks:

- [x] Create the Planning area with shared route-aware `Calendar | Recurring` navigation.
- [x] Extract one shared create/edit recurring form UI.
- [x] Share type, category, amount, frequency, date-range, and reminder fields.
- [x] Preserve single-occurrence override behavior in shared edit preparation.
- [x] Preserve recurring transaction reconciliation and deduplication rules.
- [x] Preserve local reminder settings and notification behavior.
- [x] Remove duplicated page-local recurring form state after migration.
- [x] Keep `/calendar` and `/recurring` as deep links to the correct view while internal entry points use canonical Planning routes.
- [x] Add tests for create, edit, delete, undo, reminders, overrides, and deep links.

Exit criteria:

- there is one recurring form and one orchestration path;
- both planning views preserve existing behavior;
- duplicated form logic is removed rather than hidden.

### M5. Transactions Simplification

Goal: make transaction discovery and daily operations the primary focus.

Status: **In progress**

Dependencies: M1, M2, and the Reports destination from M3 for Financial Trajectory.

Tasks:

- [x] Remove the redundant `Recent activity` page heading.
- [x] Keep one prominent local transaction search field.
- [ ] Keep the compact `All | Expenses | Income` type control.
- [x] Merge filtering and sorting into one Filters sheet.
- [x] Show active filter chips only for non-default state.
- [x] Show result metadata only when search, filters, or non-default sorting make it useful.
- [x] Move Import out of the primary control row and into More through a direct import entry.
- [x] Remove Financial Trajectory after its primary cash-flow reading exists in Reports.
- [ ] Preserve transaction grouping, detail sheet, quick edit, swipe actions, batch actions, export, delete, and undo.
- [ ] Keep transaction rows neutral for ordinary expenses and semantic for income or exceptional states.
- [ ] Add regression tests for search, filtering, sorting, grouping, batch actions, detail, edit, delete, and undo.

Exit criteria:

- the transaction list appears before analytical content;
- default state has no redundant metadata;
- existing high-value transaction operations remain available and tested.

### M6. Add Transaction UI Decision

Goal: keep the primary Add Transaction path immediate while progressively disclosing optional fields.

Status: **Done**

Dependencies: M1 shared disclosure pattern.

Tasks:

- [x] Add an accessible `More options` disclosure for optional fields.
- [x] Move payment method, reporting treatment, description, and attachment into the disclosure.
- [x] Automatically open advanced fields when editing meaningful non-default values.
- [x] Use contextual Save/Update expense/income actions.
- [x] Preserve validation, attachment handling, reporting invariants, edit behavior, and recurring-occurrence messaging unchanged.
- [x] Add an accessible information dialog explaining how Extra and Refund affect Actual, Net, Extras only, income, expenses, and category budgets.

Exit criteria:

- required fields remain immediately available;
- optional values are never silently hidden during edit;
- reporting and recurring invariants do not regress.

### M7. Home And Budgets Simplification

Goal: keep Home decision-oriented and Budgets category-oriented.

Status: **In progress**

Dependencies: M1 lens control, M2 routes, and M3 Reports destination.

Home tasks:

- [x] Replace `Monthly snapshot` with the month label only.
- [x] Keep Available to Spend as the single dominant inverse surface.
- [x] Add the minimal `Actual | Net` control without competing with the main metric.
- [x] Keep Income and Spent as the compact secondary summary.
- [x] Remove unnecessary decorative icons if they do not improve comprehension.
- [x] Replace the full Home Cash Flow chart with amount, comparison, and sparkline.
- [x] Link the Cash Flow preview to Reports Overview.
- [x] Show at most two high-signal deterministic insights.
- [x] Keep recent transactions readable and operational.

Budgets tasks:

- [x] Make monthly budget usage and category progress the primary hierarchy.
- [x] Reduce Safe to Spend to a secondary value.
- [x] Remove the repeated large gauge.
- [x] Use the compact `Actual | Net` control and explain excluded extras.
- [x] Move `Add category budget` to the Categories section header.
- [x] Preserve alerts and visible over-budget conditions.
- [x] Add tests for Actual/Net state, Safe to Spend, category progress, alerts, and add/edit/delete flows.

Exit criteria:

- Home answers what the user can spend now;
- Budgets answers which categories need attention;
- neither screen duplicates the full Reports experience.

### M8. More And Visual-System Reduction

Goal: remove remaining navigation duplication and decorative noise.

Status: **In progress**

Dependencies: M2 through M7.

Tasks:

- [x] Limit More to Planning, Import/Export, Privacy & Backup, Settings, and authorized Admin access.
- [x] Move the persisted dark-mode control into More and remove its duplicate from Profile.
- [x] Remove Transactions, Budgets, Reports, and Year entries from More.
- [x] Replace duplicate Backup and Privacy cards with one informative row.
- [x] Render the Install Aura surface only when installation guidance or action is relevant.
- [x] Audit standard cards for gradients, glow, blur, pseudo-elements, and unnecessary shadow layers.
- [x] Keep one inverse focal surface per screen.
- [x] Keep TopBar, BottomNav, reading surfaces, and standard controls neutral.
- [ ] Verify semantic color use and dark-mode parity.
- [x] Verify typography hierarchy, tabular financial values, and minimum touch targets in code and automated semantics.
- [ ] Run visual comparison against the M0 baseline.

Exit criteria:

- More contains only occasional tools and settings;
- standard surfaces no longer compete with focal financial information;
- light and dark modes share the same hierarchy.

### M9. Regression, Release, And Documentation Sync

Goal: verify the complete redesign and align all operational documentation.

Status: **In progress**

Dependencies: M2 through M8.

Tasks:

- [x] Run `npm run lint`.
- [x] Run `npm run test`.
- [x] Run `npm run build`.
- [x] Run the targeted React tests for every changed page and shared component.
- [ ] Verify Home, Transactions, Add, Budgets, Reports, Planning, and More at all baseline widths.
- [ ] Verify light mode, dark mode, reduced motion, keyboard navigation, and screen-reader labels.
- [ ] Verify loading, empty, error, and success states.
- [x] Verify route aliases and direct deep links through automated route coverage.
- [x] Update `04-ux-analysis.md` to describe the implemented state.
- [x] Update `05-visual-design-analysis.md` to describe the implemented surface rules.
- [x] Update `01-solution-strategy.md` and `02-delivery-plan.md` if implementation changes an approved decision (no new decision introduced in M7–M9).
- [x] Update this tracker with final milestone status and residual follow-ups.
- [x] Add or update `CHANGELOG.md` only if the repository introduces one before release (repository has no changelog).

Exit criteria:

- all required checks pass;
- visual and accessibility regressions are resolved;
- documentation describes implemented behavior rather than planned intent;
- remaining gaps are explicitly recorded with owners or follow-up scope.

## Dependency Map

```text
M0 Baseline
  ↓
M1 Shared foundations
  ↓
M2 Navigation and routes
  ├──→ M3 Reports ───────┐
  ├──→ M4 Planning       │
  └──→ M6 Add            │
                         ↓
                    M5 Transactions
                         ↓
                    M7 Home/Budgets
                         ↓
                    M8 More/visual reduction
                         ↓
                    M9 Release verification
```

M4 and M6 may proceed after their dependencies without waiting for M3. M5 must wait until Reports has a destination for Financial Trajectory. M7 requires the final Reports route for Home drill-downs.

## Cross-Cutting Quality Requirements

### Testing

- New shared state or pure transforms require unit tests.
- Route and navigation changes require integration-style render tests.
- Every moved behavior requires regression coverage before the old implementation is removed.
- Visual QA is required at 320 px, 360 px, 390 px, 430 px, 768 px, and the supported desktop shell width.

### Accessibility

- Interactive targets remain keyboard reachable and correctly labelled.
- Segmented controls expose selected state programmatically.
- Bottom sheets preserve focus trapping, Escape close, and focus return.
- Primary touch targets remain at least 44 px where practical.
- Reduced-motion preferences remain respected.
- Color never becomes the only carrier of meaning.

### Privacy And Security

- Personal financial data touched: existing transactions, budgets, recurring entries, reminders, and locally derived reports.
- New personal data collection: none.
- New data transfer or subprocessor: none.
- Retention, deletion, and export semantics: unchanged.
- Admin visibility into financial data: unchanged and prohibited.
- Lens state is UI state and must not expose financial data externally.
- Any future telemetry proposal requires a separate privacy review before implementation.

### AI Governance

- No AI is introduced.
- Report insights remain deterministic and locally derived.
- Any future model-based insight feature requires a separate product, privacy, security, cost, and AI-governance decision.

### Observability And Cost

- No new provider, API, storage workflow, or usage-based service is introduced.
- No admin cost panel change is required for this UI-only initiative.
- Client errors must continue to flow through the existing error boundary and user-visible recovery states.
- Bundle-size changes from new UI dependencies are not allowed without explicit justification; reuse existing dependencies and primitives.

## Definition Of Ready

A milestone is ready to start when:

- its dependencies are `Done`;
- affected routes and files are identified;
- acceptance criteria and regression tests are listed;
- no unresolved foundational decision changes the milestone;
- baseline screenshots exist for affected screens;
- privacy, security, and data-model impact remain understood.

## Definition Of Done

A milestone is done when:

- all milestone tasks are complete;
- implementation uses shared components and domain functions at the correct layer;
- targeted tests pass;
- lint, relevant tests, and build pass for the delivered slice;
- narrow mobile, light/dark, keyboard, and reduced-motion checks pass;
- loading, empty, error, and success states are covered where relevant;
- documentation and this progress dashboard are updated;
- no temporary workaround remains undocumented.

## Risk Register

| Risk | Likelihood | Impact | Mitigation | Status |
|---|---:|---:|---|---|
| Six visual bottom-bar elements become cramped | Medium | High | Treat Add as icon-only action; verify 320/360 px before completing M2 | Open |
| Page consolidation creates large replacement components | High | High | Extract shared orchestration and view components before deleting old pages | Open |
| Progressive disclosure hides important warnings | Medium | High | Keep validation, overspend, reminders, and required actions visible | Open |
| Route consolidation breaks bookmarks or internal links | Medium | High | Preserve aliases and add direct-route regression tests | Open |
| Actual/Net state becomes ambiguous | Medium | High | Always show active state; reset to Actual on a new session | Open |
| Visual simplification weakens useful hierarchy | Low | Medium | Preserve one inverse focal surface and semantic status color | Open |
| Documentation drifts from implementation | Medium | Medium | Update tracker per milestone and run M9 documentation sync | Open |

## Blockers And Change Log

Use this table for decisions or conditions that change delivery.

| Date | Type | Milestone | Note | Resolution |
|---|---|---|---|---|
| 2026-07-21 | Decision | M0 | Approved four destinations plus the centered Add action in five equal bottom-shell slots; More remains secondary | Recorded in strategy and this tracker |
| 2026-07-21 | Decision | M0 | Approved unified Reports and Planning areas | Recorded in strategy and this tracker |
| 2026-07-21 | Decision | M0 | Approved Actual default with a minimal lens control | Recorded in strategy and this tracker |
| 2026-07-21 | Blocker | M0 | No controllable browser is connected; repository screenshots are from 2026-04-27 and predate the current UI | Open the local app in the connected Browser at `http://127.0.0.1:3000/`, then capture the required baseline viewports |
| 2026-07-21 | Progress | M1 | Added shared compact/full analytics-lens control and non-persistent session state | Typecheck, component tests, provider regression, and build pass |
| 2026-07-21 | Progress | M2 | Added approved shell, canonical routes, aliases, minimal active state, canonical internal links, and removed duplicate/dead TopBar actions | Automated route and shell coverage passes; visual viewport verification remains open |
| 2026-07-21 | Refinement | M2 | Removed More from the primary bar while preserving it as a secondary destination | Add is geometrically centered and all five bar items are equally spaced; final entry point refined in the following decision |
| 2026-07-21 | Refinement | M2 | Made the `…` More action a fixed element of every header and restored the avatar as the Profile entry | Automated coverage verifies dashboard, operational, report, back, and More header variants |
| 2026-07-21 | Progress | M3 | Added the shared Reports shell with route-aware Overview, Categories, Compare, and Year views; preserved legacy deep links | Route/component coverage, full test suite, typecheck, and production build pass; analytics content reduction remains open |
| 2026-07-21 | Progress | M3/M8 | Centralized the full three-state Reports lens in non-persistent session preferences and moved dark mode into More | Home/Budgets lens remains independent; no new financial data storage or transfer |
| 2026-07-21 | Progress | M3/M5 | Made the ranked category list primary on mobile, deferred the duplicate donut to tablet, and removed Financial Trajectory from Transactions | Category drill-down remains intact and targeted React coverage passes |
| 2026-07-21 | Fix | M7 | Separated monthly Safe to Spend usage from category-budget progress and exposed both denominators explicitly | Financial formulas are unchanged; labels now distinguish all monthly expenses from spending in budgeted categories |
| 2026-07-21 | Progress | M3 | Reduced Reports Overview to analytical KPIs and moved merchant comparison behind a secondary Compare drill-down | Safe to Spend remains on operational Home/Budgets surfaces; full regression suite passes |
| 2026-07-21 | Progress | M3 | Connected deterministic comparison insights with explicit source periods and added report empty states | M3 functional tasks are complete; visual viewport and theme verification remain before milestone completion |
| 2026-07-21 | Progress | M4 | Added shared Planning tabs, canonical Calendar/Recurring routes, legacy aliases, and canonical search/notification links | Route and component regression coverage passes; recurring form extraction remains open |
| 2026-07-21 | Progress | M5 | Removed duplicate Transactions heading and primary Import, combined filter/sort controls, and suppressed default metadata | Import now opens from More via a canonical query entry; broad operational tests remain open |
| 2026-07-21 | Decision | M6 | Rejected `More options` and contextual CTA changes for Add Transaction | Restored the original always-visible form UI and removed the superseded progressive-disclosure test |
| 2026-07-21 | Superseding decision | M6 | Approved `More options` and contextual CTA copy for Add Transaction | Optional fields are collapsed for create and automatically revealed for meaningful edit state; regression coverage added |
| 2026-07-21 | Visual hierarchy | M1/M3/M4/M7/M8 | Approved one inverse focal summary per analytical or planning view, white standard light surfaces, and primary selected controls | Navigation remains unchanged; 207 automated tests and production build pass |
| 2026-07-21 | Improvement | M6 | Added an information action beside Extra/Refund with a focus-managed explanatory dialog | Copy is grounded in the domain calculations and introduces no new financial behavior |
| 2026-07-21 | Fix | M1/M6 | Rendered shared bottom sheets through a document-level portal after nested Add Transaction surfaces appeared above the Extra/Refund dialog | The dialog and backdrop now occupy the intended top-level stacking layer; portal placement has regression coverage |
| 2026-07-21 | Progress | M4 | Extracted the recurring type, name, amount, schedule, reminder, and category controls into one shared form used by Calendar and Recurring | Recurring now supports income and expense consistently in both views; typecheck, component tests, and production build pass |
| 2026-07-21 | Accessibility | M1/M4 | Associated shared Input and Select labels with their controls using stable generated IDs | Date fields now expose accessible names without requiring page-level IDs |
| 2026-07-21 | Progress | M4 | Moved recurring draft state, create/edit hydration, validation, date normalization, entity construction, and override preservation into shared hook/domain helpers | Both Planning views now use one orchestration path; all 27 suites and 197 tests pass |
| 2026-07-21 | Fix | M4 | Corrected recurring Undo to restore from the post-deletion list instead of the stale pre-deletion state | Prevents a deleted recurring plan from being duplicated when Undo is selected in Calendar or Recurring |
| 2026-07-21 | Coverage | M4 | Added UI regressions for recurring delete/undo and occurrence-only edits | Functional M4 coverage is complete; visual viewport/theme verification remains before Done |
| 2026-07-21 | Progress | M7 | Simplified Home to month, Available to Spend, compact Income/Spent, cash-flow sparkline, at most two deterministic insights, and recent transactions | Cash-flow lens values now use the selected Actual/Net totals and drill into Reports Overview |
| 2026-07-21 | Progress | M7 | Reframed Budgets around category-limit usage, moved Safe to Spend to secondary context, and removed the duplicate gauge | Alerts and Actual/Net explanations remain; add/delete/undo regressions pass |
| 2026-07-21 | Progress | M8 | Limited More to Planning, Import/Export, Privacy & Backup, Settings, and authorized Admin; merged privacy/backup status and made install guidance conditional | Primary destinations no longer repeat in More; Profile anchors provide direct destinations |
| 2026-07-21 | Visual system | M8 | Removed gradient, glow, and multilayer elevation from standard cards and control surfaces | Inverse financial anchors retain intentional depth; semantic tokens preserve theme parity by construction |
| 2026-07-21 | Verification | M9 | Synced UX/visual documentation and passed lint, 28 test files/202 tests, production build, and diff validation | Release remains pending manual multi-viewport, light/dark, keyboard, and reduced-motion verification |

## Next Action

Run the outstanding manual visual/accessibility matrix for M0–M9 as soon as a controllable browser is available. Until then, keep M1–M5 and M7–M9 open where their definition of done requires viewport or theme evidence.
