# Delivery Plan

## Current Implementation Slice

- Simplify the primary shell to `Home | Transactions | Add | Budgets | Reports`, with five equally spaced slots and Add at the center; keep More as a secondary tools/settings area reached from a fixed `…` action in every header.
- Consolidate Insights, Compare, and Year Review into one Reports area.
- Consolidate Calendar and Recurring into one Planning area with a shared recurring form.
- Simplify Home, Transactions, Budgets, and More through clearer screen ownership; use progressive disclosure for optional Add Transaction fields while keeping required fields and recurring notices visible.
- Keep Actual as the default lens with a minimal Home/Budgets control and a complete Reports control.
- Reduce decorative surface effects while preserving semantic hierarchy, theme parity, and accessibility.
- Apply one inverse focal financial summary at most per screen, keep standard light surfaces white, and reserve solid primary blue for actions and selected controls.
- Keep the existing bottom navigation and TopBar information architecture unchanged during the color-hierarchy refinement.
- Track task-level progress, dependencies, quality gates, and risks in [`08-ux-simplification-progress-plan.md`](./08-ux-simplification-progress-plan.md).
- Keep the initiative local-first: no new backend, provider, AI workflow, subprocessor, or admin access to personal financial data.
- Keep financial comparison semantics explicit: expense change, net cash-flow change, account opening balances, and scheduled-versus-remaining recurring totals must not be reused as interchangeable metrics.

## Quality Gates

- Typecheck with `npm run lint`.
- Unit tests with `npm run test`.
- Production build with `npm run build`.

## UX Simplification Release Readiness — 2026-07-21

- Automated gate: typecheck, 220 tests across 33 files, production build, and diff validation pass.
- Configuration and migrations: none. The release changes client UI composition and session-only lens state; it introduces no environment variables, storage migrations, backend jobs, or provider dependencies.
- Compatibility: legacy report, planning, and transaction routes remain valid aliases.
- Rollback: revert the client bundle to the previous release; no data rollback is required because financial schemas and persistence semantics are unchanged.
- Post-release watch: client error-boundary events, navigation/deep-link failures, PWA install availability, and user reports about narrow-width clipping or theme contrast.
- Remaining release gate: manual verification at baseline widths in light/dark mode, keyboard navigation, reduced motion, and screen-reader labels when a controllable browser is available.
- Known non-blocking build warning: the existing large bundles and mixed static/dynamic PapaParse import remain unchanged in architectural scope and should be addressed in a dedicated performance slice.

## Privacy And Security Checks

- Financial data remains local unless cloud backup is explicitly enabled.
- Cloud backup payload is encrypted before Firestore write.
- Admin scope remains access allowlist management, not financial data access.
- No AI provider or model dependency remains in application scope.
- Search indexes are computed in memory from local state and are not sent to any service.
- Compare and year-review reports are computed locally from local transactions.
- Notifications and reminders are stored locally and use browser notification permission; no Firebase Cloud Messaging or backend scheduler is introduced.
- The mobile PWA install button does not store install, device, or usage state and does not send any data to a service.
- No new subprocessors or cross-device transfers are introduced by the feature set.
- The account-field compatibility migration runs locally during model normalization and does not introduce new personal data, retention, export, vendor, or transfer behavior.

## Feature Delivery Slices

The current UX simplification milestones M0-M9 are defined and tracked in [`08-ux-simplification-progress-plan.md`](./08-ux-simplification-progress-plan.md). The list below records the previous delivered feature baseline that the redesign must preserve.

1. Visual and navigation foundations: accent tokens, dark container tuning, `/compare`, `/year-review`, TopBar search and notification entrypoints.
2. Global search: pure search domain, local recent searches, command palette, keyboard shortcut.
3. Compare periods: pure finance comparison functions, route, charts, category deltas, insights.
4. Year in review: annual finance calculations, summary, trend chart, heatmap, category shifts, share text.
5. Local notifications: typed preferences/reminders/records, scheduler hook, profile preferences, notification center, service worker message/click handling.
6. UX quality pass: contextual TopBar back navigation, consistent empty states, undo toasts for destructive actions, haptics, pull-to-refresh feedback, reduced-motion support, focus trap baseline, and ARIA fixes.
7. Advanced UX pass: swipe-to-action transaction rows, inline quick-edit sheet, batch selection with category change/export/delete, edge swipe navigation between primary pages, and desktop shortcuts.
8. Visual design pass: accent color tokens, typography tokens, stronger dark-mode containers, category icon theme configuration, animated counters, sparklines, radial safe-to-spend gauge, and replacement of hardcoded chart accents in new/updated surfaces.
9. Mobile PWA install action: browser install event handling, iOS manual add-to-home-screen guidance, standalone suppression, and later relocation from the header to More.
10. Verification and documentation sync: typecheck, unit tests, production build, strategy and delivery docs.

## Follow-Up Candidates

- Migrate categories from string names to stable IDs with archived metadata.
- Add schema validation for LocalStorage, CSV import, and backup restore payloads.
- Improve PWA offline behavior and update/install lifecycle.
- Add user-facing export for report summaries.
- Add PNG export for year-in-review if report sharing needs visual output.
