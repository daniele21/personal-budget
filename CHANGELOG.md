# Changelog

## Unreleased

### Changed

- Expanded the guided tour from a route-level overview to a 27-step operating
  journey across Home, transaction entry, history, budgets, reports, global
  tools, and planning. Each step now auto-scrolls to a stable feature region,
  tracks it during motion, and moves the explanation above or below the
  spotlight without obscuring it on mobile viewports. Route changes now
  spotlight the selected destination control instead of showing an “Opening”
  card; the current primary navigation item remains highlighted throughout the
  tour, while Reports/Planning tabs are highlighted during handoff and their
  dedicated steps. Step motion is limited to a subtle fade.
- Removed the duplicate clickable “Private by design” callout from More; Data &
  Privacy now has one unambiguous entry point in the tools list.
- Added a one-time browser-local PWA install dialog after the authenticated
  first-access setup, with a native Chromium install action, Safari instructions
  on iOS, and persistent retry actions in the top bar and under More.
- Cloud backup now retains the latest three timestamped encrypted versions per
  user, rotates them transactionally across devices, and lets the user select
  the exact version to restore from onboarding or Data & Privacy.
- Added a local-only synthetic authentication adapter and a 29-case Playwright matrix covering Chromium, WebKit, mobile emulation, encrypted export/deletion/restore equivalence, rejection safety, all restore-journal reload states, accessibility/responsive behavior, bounded resource evidence, and PWA shell registration; the non-admin bypass is loopback-only and cannot be built or deployed.
- Made Add Transaction more compact by grouping type with amount, placing essential fields in one dense form, keeping optional details behind `More options`, and keeping the contextual save action reachable above the bottom navigation.
- Added Aura Portable Archive V1 under Data Management: one encrypted-by-default, self-verified `.aura` export; local-only unlock and preview; safety-protected replace restore; startup recovery; and clear separation from transaction CSV and AI-assisted bank-statement import. General release remains gated on physical-device/installed-PWA, manual screen-reader, and approximately 32 MiB mobile-memory QA.

### Fixed

- Captured Chromium’s one-shot PWA install event at application startup,
  registered the service worker immediately, and made the More install action
  invoke the native installer on supported Android and desktop browsers while
  preserving Safari instructions for iOS.
- Removed invalid remote demo-image values from transaction attachment references
  and migrated existing demo copies before strict persistence, preventing
  `attachmentUrl is too long` save failures.
- Projected extended application state onto canonical `AppData` before strict
  local persistence, preventing onboarding metadata from being rejected as an
  unsupported Archive V1 field.
- Restored keyboard focus to the invoking control when archive and confirmation dialogs close.
- Separated expense month-over-month change from net cash-flow change on Home.
- Limited the current Planning summary to recurring payments due today or later and clarified past/current/future labels.
- Made custom report ranges valid by construction and based category trend buckets on actual duration.
- Prevented Spending Pace from ending before its custom start date when the current month is included.
- Replaced the mismatched cash-flow goal with a current-versus-previous net comparison.
- Preserved immutable budget updates and initialized date inputs from the local calendar day.
- Corrected month-status copy for past, current, and future Home views.
- Defined Net Worth as account opening balances plus ledger net, with migration from legacy account `balance` data.
- Kept the selected comparison category valid when the available category set changes.
