# Delivery Plan

## Current Implementation Slice

- Add global search across transactions, recurring entries, budgets, savings goals, and categories.
- Add period comparison reporting with A/B presets, summary cards, category deltas, overlay chart, and deterministic insights.
- Add year-in-review reporting with annual summary, monthly trend, highlights, heatmap, category shifts, and text sharing.
- Add local-only notification preferences, notification center, custom reminders, and service-worker notification click handling.
- Keep the feature set local-first: no backend push provider, no AI provider, and no admin access to personal financial data.

## Quality Gates

- Typecheck with `npm run lint`.
- Unit tests with `npm run test`.
- Production build with `npm run build`.

## Privacy And Security Checks

- Financial data remains local unless cloud backup is explicitly enabled.
- Cloud backup payload is encrypted before Firestore write.
- Admin scope remains access allowlist management, not financial data access.
- No AI provider or model dependency remains in application scope.
- Search indexes are computed in memory from local state and are not sent to any service.
- Compare and year-review reports are computed locally from local transactions.
- Notifications and reminders are stored locally and use browser notification permission; no Firebase Cloud Messaging or backend scheduler is introduced.
- No new subprocessors or cross-device transfers are introduced by the feature set.

## Feature Delivery Slices

1. Visual and navigation foundations: accent tokens, dark container tuning, `/compare`, `/year-review`, TopBar search and notification entrypoints.
2. Global search: pure search domain, local recent searches, command palette, keyboard shortcut.
3. Compare periods: pure finance comparison functions, route, charts, category deltas, insights.
4. Year in review: annual finance calculations, summary, trend chart, heatmap, category shifts, share text.
5. Local notifications: typed preferences/reminders/records, scheduler hook, profile preferences, notification center, service worker message/click handling.
6. UX quality pass: contextual TopBar back navigation, consistent empty states, undo toasts for destructive actions, haptics, pull-to-refresh feedback, reduced-motion support, focus trap baseline, and ARIA fixes.
7. Advanced UX pass: swipe-to-action transaction rows, inline quick-edit sheet, batch selection with category change/export/delete, edge swipe navigation between primary pages, and desktop shortcuts.
8. Visual design pass: accent color tokens, typography tokens, stronger dark-mode containers, category icon theme configuration, animated counters, sparklines, radial safe-to-spend gauge, and replacement of hardcoded chart accents in new/updated surfaces.
9. Verification and documentation sync: typecheck, unit tests, production build, strategy and delivery docs.

## Follow-Up Candidates

- Migrate categories from string names to stable IDs with archived metadata.
- Add schema validation for LocalStorage, CSV import, and backup restore payloads.
- Improve PWA offline behavior and update/install lifecycle.
- Add user-facing export for report summaries.
- Add PNG export for year-in-review if report sharing needs visual output.
