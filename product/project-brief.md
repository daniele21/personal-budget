# Aura Finance Project Brief

## Product Goal

Aura Finance is a mobile-first personal budget PWA for tracking income, expenses, budgets, recurring payments, savings goals, and financial reports.

## Target User

Individuals who want a private, lightweight way to manage personal finances from a phone while retaining control over their data.

## Core Principles

- Local-first financial data storage.
- Optional encrypted cloud backup, enabled only by explicit user opt-in.
- Clear monthly and weekly reporting.
- Preserved historical data for accurate reports.
- Access control through two designated administrator accounts and an allowlist,
  without administrator access to users' financial data.
- Portable archive and core financial workflows do not use AI; the separate generic bank-statement import may use Gemini only after explicit disclosure and consent.

## Current Scope

- Transactions and category tracking.
- Monthly budgets and safe-to-spend calculations.
- Recurring payments and calendar views.
- Weekly/monthly reports.
- Savings goals.
- Category management with archive/restore.
- Firebase Authentication, admin allowlist, and optional encrypted Firestore backup.
- One local-only Aura Portable Archive for complete supported-workspace disaster recovery.
- Separate transaction CSV interoperability and consented AI-assisted generic spreadsheet import.

## Implemented Shared Reporting Initiative

Aura extends the shared React reporting experience used by both the hosted
PWA and the bundled Android Capacitor application.

- Category rows expose total selected-period spending and, when at least
  two complete calendar months are available, average monthly spending.
- Selecting a category opens a category report with a calendar-month trend,
  explicit partial-month treatment, and the highest-impact transactions for the
  selected category, period, and analytics lens.
- Spending Pace uses one calendar-month baseline instead of independent
  seven-day, twenty-eight-day, and ninety-day windows. Its monthly value
  averages up to the latest three complete calendar months; weekly and daily
  figures are equivalents derived from that same baseline.
- Selected-period totals may include partial months. Monthly averages never do,
  and the UI will state how many complete months form each average.

The initiative is local-only, requires no persisted-data migration, backend,
provider, AI workflow, subprocessor, or native Android financial-domain
implementation.

## Implemented, Release-Gated Initiative

- Aura Portable Archive V1 implements user-initiated, local-only disaster recovery.
- One `.aura` file preserves the complete supported workspace, including attachments and user-created reminders.
- Import is replace-only, safety-protected, journaled, verified after persistence, and recovered before normal app hydration after interruption.
- Portable archive import remains separate from transaction CSV and bank-statement import and never enters the AI-assisted path.
- Passphrase protection is selected by default, with an explicitly warned unencrypted option.
- General release remains gated on physical-device/installed-PWA, manual screen-reader, approximately 32 MiB mobile-memory acceptance, and privacy-owner governance confirmation.

Delivery scope and progress are tracked in [`docs/00-discovery/10-portable-archive-progress-plan.md`](../docs/00-discovery/10-portable-archive-progress-plan.md).

## Planned Android Initiative

Aura will retain the existing PWA and add a companion Android distribution based on Capacitor. Both distributions share the React application and canonical financial domain; Android-only capabilities are isolated behind typed platform adapters and native Kotlin plugins.

The first planned native capability is optional payment detection from notifications:

- disabled by default;
- limited to explicitly supported and user-selected payment apps;
- parsed locally with deterministic app-specific rules;
- never routed to Gemini, Firebase, analytics, or another network service;
- persisted first as a short-lived native `PaymentCandidate`;
- converted into a normal Aura transaction only after explicit user review;
- excluded from Aura cloud backup, portable archives, and Android system backup while pending.

The technical spike uses a synthetic notification source. The first real payment app is selected only after a privacy-approved fixture process and verified package/template evidence exist. EUR card payments are the initial product scope; generic incoming transfers, salary, P2P, card identifiers, Open Banking, remote rules, and automatic posting remain outside the MVP.

Strategy, dependencies, quality gates, governance work, and progress are tracked in [`docs/00-discovery/11-android-payment-detection-progress-plan.md`](../docs/00-discovery/11-android-payment-detection-progress-plan.md).

## Non-Scope

- AI recommendations or automated financial advice.
- Admin visibility into users' financial records.
- Bank account aggregation or open banking integrations.
- Replacing or deprecating the PWA when the Android companion is introduced.
