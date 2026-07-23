# Changelog

## Unreleased

### Changed

- Added a local-only synthetic authentication adapter and a 29-case Playwright matrix covering Chromium, WebKit, mobile emulation, encrypted export/deletion/restore equivalence, rejection safety, all restore-journal reload states, accessibility/responsive behavior, bounded resource evidence, and PWA shell registration; the non-admin bypass is loopback-only and cannot be built or deployed.
- Made Add Transaction more compact by grouping type with amount, placing essential fields in one dense form, keeping optional details behind `More options`, and keeping the contextual save action reachable above the bottom navigation.
- Added Aura Portable Archive V1 under Data Management: one encrypted-by-default, self-verified `.aura` export; local-only unlock and preview; safety-protected replace restore; startup recovery; and clear separation from transaction CSV and AI-assisted bank-statement import. General release remains gated on physical-device/installed-PWA, manual screen-reader, and approximately 32 MiB mobile-memory QA.

### Fixed

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
