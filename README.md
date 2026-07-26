# Aura Finance

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=fff)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss&logoColor=fff)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-auth_%2B_backup-FFCA28?logo=firebase&logoColor=111)](https://firebase.google.com/)
[![PWA](https://img.shields.io/badge/PWA-mobile--first-5A0FC8)](https://web.dev/explore/progressive-web-apps)
[![Privacy](https://img.shields.io/badge/privacy-local--first-0F766E)](#privacy-and-security)

Aura Finance is a mobile-first Progressive Web App for managing personal budgets, expenses, income, recurring payments, savings goals, and financial reports without giving up control of personal data.

The project is built around one clear principle: financial data stays in the user's browser first. Cloud storage exists only as an optional encrypted backup, enabled explicitly by the user. Admin access is limited to allowlist management and does not expose personal financial records.

## Mission

Help people quickly understand how much they can spend, where their money is going, and which recurring commitments are coming up, while keeping a concrete privacy-first posture.

Aura Finance prioritizes:

- local data and explicit user control;
- reliable financial numbers for everyday decisions;
- a fast, readable mobile-first interface for frequent use;
- useful reports without sending data to external services;
- simple, testable, and maintainable architecture.

## Problem It Solves

Many budgeting apps are too complex, require cloud accounts, integrate bank data, or treat privacy as a generic promise. Aura Finance focuses on a more restrained use case: a person wants to record income and expenses, track budgets and recurring payments, read clear reports, and optionally keep an encrypted backup without handing their full financial history to an application backend.

## Core Features

- Dashboard with total balance, income, expenses, safe-to-spend, and spending summary.
- Transaction management with categories, date, payment method, notes, and local attachments.
- History with search, filters, editing, deletion, and financial trajectory.
- Category budgets with progress state and in-app alerts.
- Recurring payments with daily, weekly, monthly, and yearly frequencies.
- Calendar view for transactions and recurring items.
- Reports, period comparison, and year-in-review calculated locally.
- Global search across transactions, recurring items, budgets, goals, and categories.
- Savings goals and category management with archiving to preserve historical meaning.
- CSV import/export for data portability.
- Local notifications and reminders through the browser and service worker.
- Light/dark theme, installable PWA, and mobile-first design.
- Google sign-in with Firebase Authentication.
- Optional encrypted Firestore backup for cross-device restore.
- Admin panel limited to user allowlist management.
- First-run flow with a choice between restoring a found backup, using local demo data, or starting from scratch.

## Functional Preview

The following screens show the app's main flow with local demo data: quick financial status, transaction entry, history analysis, reports, budgets, and recurring items.

| Dashboard | Spending Breakdown | New Transaction |
|---|---|---|
| <img src="screenshots/Screenshot%202026-04-27%20alle%2011.21.27.png" alt="Dashboard with total balance, safe to spend, income, and expenses" width="220"> | <img src="screenshots/Screenshot%202026-04-27%20alle%2011.21.34.png" alt="Dashboard with spending by category chart and category list" width="220"> | <img src="screenshots/Screenshot%202026-04-27%20alle%2011.21.51.png" alt="Add transaction screen with amount, title, and category" width="220"> |
| Total balance, safe-to-spend, and monthly metrics to understand available money at a glance. | Donut chart and category breakdown to identify the main spending areas. | Mobile-first entry for movement type, amount, title, category, date, and payment method. |

| History | Monthly Report | Report Detail |
|---|---|---|
| <img src="screenshots/Screenshot%202026-04-27%20alle%2011.22.05.png" alt="Transaction history sorted by date" width="220"> | <img src="screenshots/Screenshot%202026-04-27%20alle%2011.22.15.png" alt="Monthly report with income, expenses, net flow, and spending breakdown" width="220"> | <img src="screenshots/Screenshot%202026-04-27%20alle%2011.22.23.png" alt="Report with budget detail and category spending" width="220"> |
| Date-sorted transaction list with amounts, categories, and descriptions. | Local report with income, expenses, net flow, and comparison with the previous period. | Category analysis with budget progress and changes from the previous period. |

| Calendar | Recurring Items | Budgets |
|---|---|---|
| <img src="screenshots/Screenshot%202026-04-27%20alle%2011.22.33.png" alt="Monthly calendar with income, expenses, and recurring summary" width="220"> | <img src="screenshots/Screenshot%202026-04-27%20alle%2011.22.44.png" alt="Recurring items and transactions for the selected day" width="220"> | <img src="screenshots/Screenshot%202026-04-27%20alle%2011.22.50.png" alt="Budgets page with monthly progress and category limits" width="220"> |
| Monthly view with daily indicators for transactions and recurring items. | Active recurring items, generated transactions, and details for the selected day. | Monthly category limits, spent amount, remaining amount, and overall progress. |

## Privacy And Security

Aura Finance follows a local-first model:

- transactions, budgets, categories, preferences, and reminders are stored locally in the browser;
- image attachments are stored in IndexedDB;
- cloud backup is disabled by default;
- when backup is enabled, the payload is encrypted before being written to Firestore;
- admins cannot access users' financial records;
- no AI features are included in the current scope;
- notifications, search, comparisons, and reports are calculated locally;
- demo data is generated and stored only in the browser; if a cloud backup exists and the user chooses blank or demo data, local cloud backup is disabled to prevent accidental overwrite.

For operational details, see [privacy-notes.md](docs/04-privacy-gdpr/privacy-notes.md), [project-brief.md](product/project-brief.md), and [solution-strategy.md](docs/00-discovery/01-solution-strategy.md).

The two designated administrator accounts are defined in
`src/config/adminAccess.ts` and mirrored by the `isAdmin()` helper in
`firestore.rules`. Regression tests fail if the two policies diverge.

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS 4, CSS design tokens |
| Motion | Motion / Framer Motion API |
| Charts | Recharts |
| Local storage | localStorage, IndexedDB through `idb-keyval` |
| Auth and optional cloud | Firebase Authentication, Firestore |
| Tests | Vitest, TypeScript typecheck |
| Deploy | Firebase Hosting |

## Repository Architecture

![Aura Finance architecture diagram](docs/assets/aura-architecture.svg)

```text
src/
  components/        Reusable UI components
  context/           Application state and client orchestration
  data/              Storage keys and local data helpers
  domain/            Pure finance, recurring, category, and search logic
  hooks/             Application hooks and browser integrations
  lib/               Firebase, encrypted backup, and shared utilities
  pages/             Main application routes
  utils/             Formatters and cross-cutting helpers

docs/                Discovery, strategy, privacy, and product analysis
product/             Product brief and intent
public/              Manifest, service worker, and static assets
scripts/             Operational scripts, including hosting deploy
```

Product and architecture decisions are documented in `product/` and `docs/00-discovery/`. Before changing flows, data, privacy, security, or architecture, also read [AGENTS.md](AGENTS.md).

## Run Locally

Prerequisite: Node.js installed.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment file:

   ```bash
   cp .env.example .env
   ```

3. Fill `.env` with the required Firebase values.

4. Start the app:

   ```bash
   npm run dev
   ```

The app is served by Vite on port `3000`.

## Android Development

Aura also ships the same React application inside a Capacitor Android shell.
The PWA remains an independent, supported distribution; payment detection will
be an Android-only capability behind a platform adapter.

The current Android baseline is Android 16/API 36 only. Local development
requires JDK 21 and an Android SDK containing platform and build tools 36.
Android Studio is optional for the command-line workflow.

```bash
npm run android:sync:debug
npm run android:test
npm run android:lint
npm run android:assemble:debug
```

Create an ignored `.env.android-debug.local` with every
`VITE_ANDROID_FIREBASE_*` value shown in `.env.example`. The debug build refuses
to start without this isolated non-production Firebase/OAuth configuration and
does not inherit the normal web values. The Android OAuth client must match
`com.staituned.aura.debug` and the debug signing certificate; Credential
Manager uses the Web client ID generated as an Android resource from
`google-services.json`. The client ID is not passed through the Capacitor
bridge.

`android:sync:debug` rebuilds and copies the isolated debug bundle.
`android:sync` is reserved for the normal production bundle. Both keep
Capacitor logging and WebView debugging disabled. Use
`android:sync:diagnostic` only for an explicitly local diagnostic build.
`android:test` intentionally runs the debug unit-test variant because the local
`google-services.json` contains only the non-production debug client. Release
tests and builds require a production client for `com.staituned.aura`.

To diagnose the Android Google sign-in flow:

```bash
npm run android:sync:diagnostic
bash scripts/run-android-gradle.sh assembleDebug
adb logcat -c
adb logcat -v color AuraGoogleAuth:V Capacitor/Console:V '*:S'
```

Authentication diagnostics identify only the failing stage, a bounded error
code, the exception class, and sanitized native stack frames. They never log
the Google ID token, OAuth client ID, email, credential payload, exception
message, or Firebase user profile. Expected outcomes such as
`AUTH_NO_CREDENTIAL` are warnings; unexpected provider, parsing, or clear-state
failures are errors. Native diagnostics are emitted only when Android marks the
installed application as debuggable, while WebView console forwarding requires
the explicit diagnostic sync above.

The generated debug application uses `com.staituned.aura.debug` and the
`Aura Dev` label. Signing files, `google-services.json`, local SDK paths, and
keystores must remain outside source control. The notification listener and
payment parser are not implemented yet. The native Credential Manager bridge is
implemented, and the local non-production OAuth configuration has been
validated. Successful sign-in still requires a Google account and credential
provider on the test device.

## Firebase Setup

In the Firebase project:

1. enable Google sign-in in Authentication;
2. create a Firestore database;
3. configure rules from [firestore.rules](firestore.rules);
4. fill the `VITE_FIREBASE_*` variables in `.env`.

Main collections:

- `allowedUsers/{emailHash}`: access allowlist based on hashed email;
- `backups/{uid}`: optional cloud backup, encrypted client-side.

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite in development |
| `npm run lint` | Run the TypeScript typecheck |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Start Vitest in watch mode |
| `npm run build` | Generate the production build |
| `npm run build:android:debug` | Build with required isolated Android debug Firebase/OAuth values |
| `npm run android:sync` | Build and copy the normal production bundle into Android |
| `npm run android:sync:debug` | Build and copy the isolated Android debug bundle |
| `npm run android:sync:diagnostic` | Debug sync with WebView/Capacitor diagnostics enabled |
| `npm run android:assemble:debug` | Sync and assemble the debug APK |
| `npm run android:test` | Run Android debug unit tests with JDK 21 |
| `npm run android:lint` | Run Android lint |
| `npm run android:doctor` | Inspect the Capacitor Android environment |
| `npm run preview` | Serve the build locally |
| `npm run firebase:login` | Sign in with the Firebase CLI |
| `npm run deploy:hosting` | Build and deploy to Firebase Hosting |

## Deploy To Firebase Hosting

1. Sign in to Firebase:

   ```bash
   npm run firebase:login
   ```

2. Make sure `VITE_FIREBASE_PROJECT_ID` is configured in `.env`, or pass `FIREBASE_PROJECT_ID`.

3. Deploy:

   ```bash
   npm run deploy:hosting
   ```

To deploy to a specific project without editing `.env`:

```bash
FIREBASE_PROJECT_ID=your-project-id npm run deploy:hosting
```

## Useful Documentation

- [Project brief](product/project-brief.md)
- [Project analysis](docs/00-discovery/00-project-analysis.md)
- [Solution strategy](docs/00-discovery/01-solution-strategy.md)
- [Delivery plan](docs/00-discovery/02-delivery-plan.md)
- [Privacy/GDPR notes](docs/04-privacy-gdpr/privacy-notes.md)

## Project Status

Aura Finance is an evolving PWA. The current scope includes personal budgeting, local reporting, optional encrypted backup, and access control. AI, automated financial advice, open banking, and admin visibility into users' financial data are explicitly out of scope for now.
