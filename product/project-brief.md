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
- Admin access control through an allowlist, without admin access to users' financial data.
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

## Implemented, Release-Gated Initiative

- Aura Portable Archive V1 implements user-initiated, local-only disaster recovery.
- One `.aura` file preserves the complete supported workspace, including attachments and user-created reminders.
- Import is replace-only, safety-protected, journaled, verified after persistence, and recovered before normal app hydration after interruption.
- Portable archive import remains separate from transaction CSV and bank-statement import and never enters the AI-assisted path.
- Passphrase protection is selected by default, with an explicitly warned unencrypted option.
- General release remains gated on physical-device/installed-PWA, manual screen-reader, approximately 32 MiB mobile-memory acceptance, and privacy-owner governance confirmation.

Delivery scope and progress are tracked in [`docs/00-discovery/10-portable-archive-progress-plan.md`](../docs/00-discovery/10-portable-archive-progress-plan.md).

## Non-Scope

- AI recommendations or automated financial advice.
- Admin visibility into users' financial records.
- Bank account aggregation or open banking integrations.
