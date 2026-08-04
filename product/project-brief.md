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
- Portable archive, transaction import and core financial workflows do not use
  AI. Reintroducing remote categorization requires new discovery and approval.

## Current Scope

- Transactions and category tracking.
- Monthly budgets and safe-to-spend calculations.
- Recurring payments and calendar views.
- Weekly/monthly reports.
- Savings goals.
- Category management with archive/restore.
- Firebase Authentication, admin allowlist, and optional encrypted Firestore backup.
- One local-only Aura Portable Archive for complete supported-workspace disaster recovery.
- Separate transaction CSV interoperability and deterministic local CSV/XLSX
  transaction import.

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
- Portable archive import remains separate from transaction CSV and structured
  transaction import.
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

Whole-app production publication is governed separately by
[`docs/00-discovery/13-android-production-release-plan.md`](../docs/00-discovery/13-android-production-release-plan.md),
which aggregates Play Console, signing, account deletion, whole-app privacy and
Data Safety, landing/store presence, physical QA, beta, rollout and rollback
gates without duplicating the payment-detection implementation tracker.

Release direction confirmed on 2026-08-04:

- begin with Play Internal Testing and a closed beta using named/allowlisted
  participants; public self-service distribution is not yet authorized;
- keep payment detection beta-only and make the initial production build
  core-only without the listener;
- support Android 16/API 36 only for internal and beta;
- launch the initial tracks in Italy with an English product and English store
  presence, then expand to Europe through a later rollout decision;
- keep the initial product free;
- use a personal developer identity under the public name Daniele Moltisanti;
- publish landing/legal/support surfaces under `aura.staituned.com` and use
  `support@staituned.com` as the public support address.

The initial country is Italy and the target audience is 18+. The personal Play
account, applicable verification and `com.staituned.aura` registration are
confirmed by the owner. Single-person support risk is accepted for Internal
Testing only, with a one-week response target and a backup owner required before
closed beta. The decision record is
[`15-c2-release-decision-pack.md`](../docs/00-discovery/15-c2-release-decision-pack.md).

## Implemented, Release-Gated Initiative: Deterministic Transaction Import

Aura has replaced the former Gemini-assisted generic spreadsheet workflow with
a local-only deterministic import for CSV and XLSX files using the fixed
columns `date`, `description`, and `amount`.

The planned V1:

- derives income or expense from the signed amount;
- stages valid rows for review without changing the canonical ledger;
- starts uncategorized rows as `Uncategorized`;
- supports manual batch categorization and conservative propagation to rows
  with the same normalized description and transaction type;
- warns about possible duplicates without removing them automatically;
- permits an explicitly confirmed import with remaining uncategorized rows;
- adds no persistent import-source metadata or merchant-category rules to
  `Transaction`;
- keeps `.aura` restore and Aura transaction CSV compatibility isolated;
- removes the runtime Gemini import path, client API-key configuration and
  related admin surfaces.

M1-M5 are implemented. Broader browser, PWA, accessibility and Android release
acceptance remains governed by the later milestones in
[`docs/00-discovery/12-deterministic-transaction-import-progress-plan.md`](../docs/00-discovery/12-deterministic-transaction-import-progress-plan.md)
and does not make the feature generally released by itself.

## Non-Scope

- AI recommendations or automated financial advice.
- Admin visibility into users' financial records.
- Bank account aggregation or open banking integrations.
- Replacing or deprecating the PWA when the Android companion is introduced.
