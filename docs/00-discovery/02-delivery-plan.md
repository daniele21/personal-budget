# Delivery Plan

## Current Initiative: Aura Portable Archive V1

Aura Portable Archive V1 will add one versioned `.aura` file for complete, local-only disaster recovery while preserving transaction CSV as a separate interoperability feature.

The initiative is recovery-complete from V1: canonical app data, referenced attachments, notification preferences, custom reminders, and appearance preference are in scope. Restore is replace-only, passphrase protection is selected by default, archive processing never enters the AI-assisted import path, and cross-storage replacement uses staging, safety protection, a restore journal, and persisted read-back verification.

Task-level milestones, dependencies, tests, privacy/security work, resource limits, risks, progress updates, and done criteria are tracked in [`10-portable-archive-progress-plan.md`](./10-portable-archive-progress-plan.md). M0-M6 implementation is complete. Automated M7 browser hardening is complete; M7-M8 release closure remains conditional on physical-device/PWA, manual screen-reader, and mobile-memory verification plus resolution of the documented privacy-governance baseline gap.

User-facing behavior is specified in [`docs/specs/portable-archive-v1.md`](../specs/portable-archive-v1.md). Deployment, rollback, recovery, and privacy-safe diagnostics are defined in [`docs/03-operations/portable-archive-runbook.md`](../03-operations/portable-archive-runbook.md).

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
- Real-browser encrypted export → wipe → import → replace → reload comparison on supported desktop/mobile and installed-PWA targets.
- Keyboard, screen-reader-label, reduced-motion, light/dark, and 320/360/390/430 px checks.

## Portable Archive Release Readiness — 2026-07-23

- Automated gate: `npm run test:regression` passed end to end; TypeScript, all 273 Vitest tests across 48 files, and production build are green.
- Configuration/migrations: no runtime environment variable, backend migration, provider, or production dependency was added. Playwright is a development-only dependency; the client introduces only local archive/journal/staging keys.
- Compatibility: transaction CSV remains readable; the old two-download CSV action is replaced by one explicitly transaction-only CSV; `.aura` is classified before spreadsheet/Gemini processing.
- Rollback: revert the client bundle only after active V1 restore journals are resolved; keep a recovery-capable bundle available for affected clients.
- Privacy/cost: archive processing is local-only; no new subprocessor, transfer, AI call, hosted storage, or usage-based cost is introduced.
- Automated hardening: encrypted/plaintext round trips, fresh salt/IV, wrong password, tampering, large fixture, local-only preflight, AI isolation, safety-copy refusal, empty/non-empty restore, quota/write failure, rollback, resume, and object-URL revocation are covered.
- Release decision: **not ready for general release** until physical-device/installed-PWA, manual screen-reader, approximately 32 MiB mobile-memory acceptance, and privacy-owner governance confirmation are recorded.
- Automated Chromium/WebKit, mobile viewport, restore-checkpoint reload, PWA shell, responsive, keyboard, reduced-motion, and axe QA is complete. Physical mobile/PWA, manual screen-reader, and approximately 32 MiB least-capable-device evidence remain pending.
- Browser automation uses a synthetic non-admin identity through loopback-only `npm run dev:e2e`; the bypass cannot be enabled by runtime data and `vite build --mode=e2e` is rejected. All 29 Playwright project cases pass, including exact encrypted export → deletion → restore equivalence, rejection safety, non-empty safety-copy replacement, and all 11 restore-journal statuses.
- The execution-ready browser/PWA checklist is [`docs/07-qa/portable-archive-browser-acceptance.md`](../07-qa/portable-archive-browser-acceptance.md).

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
- Extend the portable archive's strict validation approach to general LocalStorage and CSV inputs after the V1 archive path is complete.
- Improve PWA offline behavior and update/install lifecycle.
- Add user-facing export for report summaries.
- Add PNG export for year-in-review if report sharing needs visual output.
