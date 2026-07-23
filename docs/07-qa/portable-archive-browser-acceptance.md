# Portable Archive Browser Acceptance

## Status

Automated browser QA passes: 29 Playwright cases across desktop Chromium, desktop WebKit, Pixel 5/iPhone 13 emulation, and a Chromium service-worker/manifest lifecycle project. The suite includes exact encrypted export → deletion → restore equivalence, safety-copy replacement, all 11 restore-journal statuses through real reloads, narrow-width checks, keyboard focus, reduced motion, and axe WCAG A/AA scans.

General release remains blocked on physical iOS/Android testing, actual installed-PWA behavior, the approximately 32 MiB least-capable-device measurement, manual screen-reader verification, and privacy-owner governance approval.

## Proposed Browser Matrix — Product Confirmation Required

| Target | Minimum proposed coverage | Result | Evidence |
|---|---|---|---|
| Desktop Chromium | Playwright Desktop Chrome | Passed (automated) | `npm run test:e2e`, 2026-07-23 |
| Desktop WebKit | Playwright Desktop Safari profile | Passed (automated) | cross-browser export/recovery, rejection, safety, accessibility, 2026-07-23 |
| Android viewport | Playwright Pixel 5 / Chromium | Passed (emulated) | auth, exact round trip, 320–430 px responsive journey, 2026-07-23 |
| iPhone viewport | Playwright iPhone 13 / WebKit | Passed (emulated) | auth, exact round trip, 320–430 px responsive journey, 2026-07-23 |
| PWA shell | Chromium service workers enabled | Passed (automated) | manifest resolution, icons, active registration and scope, 2026-07-23 |
| Physical iPhone Safari/PWA | current iOS Safari, browser tab and installed PWA | Pending | |
| Physical Android Chrome/PWA | current Chrome, browser tab and installed PWA | Pending | |

Record exact device, OS, browser version, installed/browser mode, date, tester, result, and screenshot/video reference. Do not attach real financial archives to issue trackers.

## Safe Fixture

Start browser automation with `npm run dev:e2e`. The server is loopback-only at `http://127.0.0.1:4173` and exposes the synthetic, non-admin `Aura E2E Test User` (`e2e-user@aura.invalid`). An E2E build is intentionally forbidden. Manual installed-PWA acceptance continues against the normal authenticated build because the bypass cannot be packaged.

The full browser matrix is run with `npm run test:e2e`; `npm run test:full` also runs TypeScript, Vitest, and the production build. Failure traces, screenshots, and videos are written to ignored local Playwright result directories and must contain synthetic data only.

Use synthetic data only:

- income, regular expense, extra expense, and reimbursement;
- recurring-generated transaction plus an edited occurrence;
- two budgets and two accounts;
- active and archived category;
- savings goal;
- notification preferences and custom reminder;
- at least one valid synthetic receipt and one transaction without a receipt.

Never use production financial data, personal reminders, or real receipts for QA evidence.

## Acceptance Journey

For each supported target:

1. Load the synthetic fixture and record canonical counts.
2. Open Profile → Data Management.
3. Confirm complete archive and CSV/bank import are visually and semantically distinct.
4. Open export and verify counts, encrypted default, passphrase validation, plaintext warning, cancel, and close/focus behavior.
5. Export with a test passphrase and confirm exactly one `.aura` download after the self-verification phase.
6. Confirm no archive content appears in network requests.
7. Clear supported Aura data using the product flow and reload to an empty workspace.
8. Import the archive, test one wrong passphrase, then unlock with the correct passphrase.
9. Verify source metadata, counts, encryption state, and warnings before replacement.
10. Confirm replace-only wording and safety-copy behavior when meaningful target data exists.
11. Complete restore and allow the automatic reload.
12. Compare IDs, amounts, categories, recurring links/overrides, goals, reminders, preferences, and receipt content to the fixture.
13. Confirm no empty/partial state was pushed to cloud backup during restore.

## Interruption Matrix

Use a development-only fault hook or debugger pause to reload at each journal state. Do not introduce a production fault toggle.

| Journal state | Expected startup result | Result | Evidence |
|---|---|---|---|
| `prepared` | discard staging, current workspace preserved | Passed | Chromium real reload |
| `rollback-staged` | discard staging, current workspace preserved | Passed | Chromium real reload |
| `attachments-staged` | discard staging, current workspace preserved | Passed | Chromium real reload |
| `data-committing` with matching core | resume target and verify | Passed | Chromium real reload |
| `data-committing` with partial core | rollback and verify previous | Passed (service regression) | Browser-specific variant remains optional follow-up |
| `data-committed` | resume attachments and verify target | Passed | Chromium real reload |
| `attachments-committed` | verify target and clean | Passed | Chromium real reload |
| `verified` | finish cleanup | Passed | Chromium real reload |
| `rolling-back` | finish rollback and verify previous | Passed | Chromium real reload |
| `rolled-back` | finish cleanup | Passed | Chromium real reload |
| `completed` | finish cleanup | Passed | Chromium real reload |
| `failed` | retry rollback; block hydration if still failing | Passed | Chromium real reload |

## Responsive And Accessibility Matrix

Run in light and dark themes at 320, 360, 390, and 430 CSS pixels plus desktop.

- no clipped headings, controls, passphrase fields, warnings, or primary actions;
- dialog content scrolls while close/cancel remains reachable;
- visible focus order follows close → protection → credentials/acknowledgement → primary action → cancel;
- Escape closes only non-busy dialogs;
- focus remains trapped inside each open dialog and returns to the invoking action;
- every icon-only button has an accessible name;
- status and error updates are announced through `role=status`, `role=alert`, or live regions;
- disabled actions communicate unmet prerequisites in nearby text;
- reduced motion removes non-essential transitions without hiding state changes;
- contrast remains legible in both themes.

Automated evidence passed on 2026-07-23 for 320, 360, 390, and 430 CSS pixels, light/dark archive surfaces, serious/critical axe WCAG A/AA findings, keyboard focus trapping and restoration, and reduced-motion media preference. Manual screen-reader output and physical-device visual inspection remain pending.

## Resource Measurements

On the least-capable supported mobile target, record:

| Fixture | Build | Encrypt | Read/decrypt | Restore/reload | Peak memory/result |
|---|---:|---:|---:|---:|---|
| Typical workspace | Passed (automated) | Passed (automated) | Covered by round trip | Passed (automated) | Chromium assertion: export <45s, archive >1 KiB, heap <256 MiB |
| Approximately 32 MiB archive | Pending | Pending | Pending | Pending | Pending |

The page must remain responsive enough to show real progress. Any crash, browser tab eviction, download failure, or recovery loop blocks release and may require lowering V1 limits.

## Completion Record

- QA owner:
- Date:
- Browser matrix approved by:
- Failed cases/issues:
- Residual risks accepted by:
- Release recommendation: Pending
