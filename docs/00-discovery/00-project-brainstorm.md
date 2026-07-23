# Aura Finance Project Brainstorm

## Current Initiative

The current approved initiative is **Aura Portable Archive V1**, a local-first disaster-recovery format that is separate from transaction CSV import and export.

Discovery status: **Converged for delivery planning** on 2026-07-22.

The living implementation tracker is [`10-portable-archive-progress-plan.md`](./10-portable-archive-progress-plan.md).

## Problem

The existing CSV export is suitable for analysis and interoperability, but it cannot reconstruct Aura after local data loss. It exports transactions and budgets as separate downloads, while import restores only transactions and otherwise routes generic spreadsheet data through the AI-assisted bank-statement workflow.

A recovery artifact must instead preserve the complete user workspace, remain usable without cloud backup, and be read entirely on the device before any existing data is changed.

## Approved Product Direction

- Keep transaction CSV import and export as a separate interoperability feature.
- Introduce one versioned `.aura` file for complete local disaster recovery.
- Include canonical app data, attachments, notification preferences, custom reminders, and appearance preference.
- Exclude authentication/session data, Firebase identity data, caches, navigation state, notification history, and the cloud-backup enablement flag.
- Offer passphrase protection by default, with an explicit warned option to export without encryption.
- Use replace-only restore in V1; do not implement merge.
- Detect and process `.aura` archives before the spreadsheet/AI import path.
- Validate, migrate, normalize, stage, safety-copy, commit, and verify before declaring success.
- Add a restore journal because localStorage and IndexedDB cannot participate in one atomic transaction.
- Preserve legacy Aura transaction CSV import and generic bank-statement import.
- Keep manual portable archive delivery independent from the existing cloud-backup transport in V1.

## Alternatives Considered

### Expand The Existing CSV

Rejected because CSV cannot reliably represent the complete graph of Aura data, binary attachments, versioned migrations, integrity metadata, and restore state.

### App Data Only In V1

Rejected because an archive that omits receipts and user-created reminders would not satisfy the recovery promise.

### Merge Restore In V1

Rejected because duplicate IDs, recurring-materialization history, renamed categories, budgets, goals, and attachment conflicts make merge behavior difficult to explain and verify safely.

### Mandatory Encryption

Rejected because a forgotten passphrase would make disaster recovery impossible. Encryption remains selected by default, while unencrypted export requires an explicit warning and confirmation.

### Immediate Cloud-Backup Migration

Deferred. The archive codec should be reusable, but the current cloud transport must not be assumed to support arbitrary attachment volume or the same persistence layout.

## Remaining Non-Blocking Technical Discovery

These choices must be resolved in milestone M0, but they do not change the approved product direction:

- exact internal envelope/container encoding;
- whether a small archive dependency is justified or native browser primitives are sufficient;
- mobile memory and maximum archive-size budgets;
- exact key-derivation work factor and compatibility policy;
- detailed restore-journal recovery transitions;
- whether the archive format warrants the repository's first ADR.

## Convergence Gate

Discovery is considered converged because scope, recovery semantics, privacy boundary, encryption posture, AI isolation, and V1 non-scope are approved. Implementation may begin only after the M0 technical contract and test fixtures in the progress plan are complete.
