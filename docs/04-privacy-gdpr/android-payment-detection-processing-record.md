# Android Payment Detection Processing Record

## Status

- Processing state: M3 foundation and M4 synthetic listener implemented; real
  payment-notification processing prohibited
- Engineering direction: approved
- Real-user processing: prohibited until privacy-owner approval
- Last reviewed: 2026-07-26
- Tracker: [`11-android-payment-detection-progress-plan.md`](../00-discovery/11-android-payment-detection-progress-plan.md)
- Feature spec: [`android-payment-detection-mvp.md`](../specs/android-payment-detection-mvp.md)

This is an engineering governance record, not legal advice or certification.

The legal-source register required by `AGENTS.md` is not present in this repository. No legal conclusion has therefore been validated against an authoritative project baseline; lawful basis, role allocation and DPIA outcome remain blocked on the privacy owner.

The implemented M3 boundary is documented in
[`android-payment-detection-security.md`](../01-architecture/android-payment-detection-security.md).
It processes a Firebase UID transiently only to install a Keystore-backed
hashed owner boundary. M4 tests read only a static synthetic notification from
the repository-controlled test APK. No real notification content is read, no
candidate is created, and no off-device transfer is added.

## Processing Activity

Optional on-device monitoring of notifications posted by supported and explicitly user-selected Android payment applications for the purpose of preparing a transaction candidate that the user may review, edit, confirm, or ignore.

The system notification-access grant applies to the Aura listener as a whole. Aura enforces narrower per-app access in code by checking the package before reading notification extras.

## Purpose

- reduce manual data entry;
- reduce omitted card-payment records;
- prepare a user-controlled expense candidate;
- preserve Aura's local-first model.

Prohibited purposes:

- advertising;
- profiling unrelated to the user's budget;
- credit, eligibility, employment, insurance, or other consequential decisions;
- fraud monitoring of another person;
- training or evaluating AI;
- sale or sharing of notification/app-inventory data;
- background collection without the approved product feature.

## Data Subjects

- the authenticated Aura user;
- potentially another person named in a notification, although the MVP rules should not target messages or transfers that contain counterparties.

The possibility of incidental third-party data strengthens the requirement to exclude transfers, free-form messages, SMS, and unsupported notifications.

## Data Categories

### Ephemeral Input

- source package;
- notification title;
- notification text;
- expanded notification text;
- notification key/ID;
- posting timestamp.

### Persisted Candidate

- random candidate ID;
- hashed owner partition;
- internal source app identifier;
- encrypted and authenticated payload containing amount, EUR currency, optional merchant and occurrence timestamp;
- detection timestamp;
- match tier;
- rule ID/version;
- hashed technical/semantic fingerprints;
- workflow status and expiry;
- short-lived acceptance reservation.

### Final Financial Record

After confirmation, Aura stores a normal transaction with user-reviewed values and a normal UUID. It does not retain bank package, candidate ID, rule, fingerprint, or notification text in the ledger.

### Explicitly Excluded

- OTP;
- balance;
- card number;
- card suffix;
- account number;
- raw notification persistence;
- Firebase token in candidate/detection storage. Android authentication may
  hold a Google ID token transiently in memory while exchanging it for the
  existing Firebase JS session; the native bridge does not persist or log it;
- email in candidate storage;
- screenshots, icons, avatars, notification actions, and remote views.

## Storage Locations

| Data | Location | Backup |
|---|---|---|
| Raw input | Process memory during parsing | Never |
| Candidate payload | Private Room database | Excluded from Aura and Android backup |
| Selected-app settings | Private native preferences | Excluded from Android backup |
| Keystore key | Android Keystore | Not exported |
| Tombstone | Private Room database | Excluded from all backup |
| Confirmed transaction | Canonical Aura AppData | Existing local/archive/opt-in encrypted cloud rules |

## Recipients And Transfers

Planned recipients: none.

Planned off-device transfer of candidate data: none.

Existing Firebase/Gemini code in the application must not receive detection data. Android backup and device-to-device transfer must be disabled or explicitly exclude all Aura/detection storage. If effective exclusion cannot be verified, the "no transfer" conclusion is not satisfied.

No new subprocessor is introduced by the approved design. Google Play distribution and platform operation do not authorize sending candidate content to Google.

## Retention

| Record | Retention |
|---|---|
| Raw notification strings | Parsing duration only |
| Pending candidate | 14 days |
| Ignored candidate payload | Deleted immediately |
| Ignored tombstone | 7 days |
| Accepted/edited payload | Deleted after verified transaction commit |
| Accepted/edited tombstone | 30 days |
| Failed acceptance | Until deterministic recovery completes |
| Selected-app settings | Until disable, logout, owner change, or reset as applicable |

Retention changes require product rationale, privacy review, tests, and documentation updates.

## Security Measures

Implemented in M3:

- owner partition derived with HMAC-SHA256 and a non-exportable Android
  Keystore key, without storing Firebase UID, email, or token;
- purge journal and recovery for logout, account change, local reset, and total
  deletion;
- AES-GCM candidate-field primitive with owner, opaque candidate ID, and schema
  version authenticated as associated data;
- bundled WebView assets, exact-origin navigation allowlist, cleartext disabled,
  restrictive CSP, Auto Backup disabled, and exhaustive cloud/D2D exclusions;
- release R8/resource shrinking and Android log stripping;
- no crash-reporting/breadcrumb SDK and no notification fields exposed by the
  M3 bridge.

Required in later milestones before real-notification processing:

- package allow checks before extras;
- finite package visibility declarations;
- bundled deterministic rules;
- input-length cap and regex safety tests;
- off-main-thread parsing;
- no raw bridge DTO;
- no production dynamic logging;
- no custom candidate telemetry;
- hashed fingerprints;
- suspend without active owner;
- internal/non-exported helpers and receivers;
- immutable PendingIntent where possible;
- private lock-screen notification;
- explicit Android backup/data-extraction exclusions;
- idempotent cross-storage acceptance journal.

## User Controls

Before enabling:

- in-app prominent disclosure;
- separate affirmative action;
- system settings grant;
- explicit supported-app selection.

After enabling:

- pause detection;
- add/remove a supported app;
- inspect pending candidates;
- edit, accept, or ignore;
- delete candidates and tombstones;
- open Android settings to revoke listener access;
- local reset;
- total local+cloud deletion;
- logout/account change purge.

The UI must not interpret navigation, back press, dismissal, or an existing system grant as Aura feature consent.

## Rights Handling

### Access

Pending candidates must be visible in the local queue. Tombstone internals do not need user-facing detail but must be included in deletion.

### Rectification

Candidate values can be edited before confirmation. Confirmed transactions use existing edit flows.

### Erasure

Explicit candidate deletion, logout, owner change, local reset, and total deletion purge managed native records. Android system settings revocation alone stops future access but does not replace Aura's deletion control.

### Portability

Pending candidates and tombstones are transient workflow data and are excluded from `.aura` and CSV. Confirmed transactions follow existing archive/CSV behavior as normal transactions.

The privacy owner must confirm whether this distinction satisfies the product's formal access/portability process.

### Restriction/Objection

The user can pause the feature without deleting existing transactions. The feature is off by default and is not necessary to use core budgeting functionality.

## Lawful Basis And Role Allocation

Unresolved governance items:

- controller identity;
- processor/controller role allocation;
- lawful basis;
- processor RoPA/data inventory entry;
- legal-source register;
- end-of-contract handling;
- formal rights-response procedure.

The system permission and in-app affirmative action are product/platform controls. They must not be documented as the GDPR lawful basis until the privacy owner records that decision.

## DPIA Screening

A screening is required because the feature performs ongoing background monitoring of financial notification context.

Factors reducing risk:

- optional and off by default;
- local-only;
- narrow user-selected packages;
- no AI or automated posting;
- no remote recipient;
- no card/account identifiers;
- short retention;
- user review and deletion.

Factors increasing risk:

- financial context;
- broad OS-level notification access;
- background processing;
- incidental unsupported or third-party content if package gating fails;
- possible multi-account/device exposure;
- lock-screen visibility;
- installed-app inventory.

Decision: pending privacy owner. No real-user beta or production release before the decision is recorded.

## Google Play Governance

Before release:

- privacy policy updated;
- Data Safety completed based on actual build behavior;
- prominent disclosure immediately before notification-access settings;
- installed-app visibility limited to finite packages;
- store listing explains the user-facing purpose;
- deletion controls accurately described;
- no spyware-like hidden or unrelated monitoring;
- app signing and developer verification complete;
- screenshots and support content do not expose real financial data.

## Approval Checklist

- [x] Product direction confirms scope and non-scope.
- [ ] Privacy owner records controller/processor role.
- [ ] Privacy owner records lawful basis.
- [ ] Privacy owner completes DPIA screening.
- [ ] Privacy owner updates data inventory/RoPA.
- [ ] Security owner approves threat model.
- [x] Engineering verifies manifest backup disablement and exhaustive source
  exclusions; physical OEM/D2D acceptance remains a release gate.
- [ ] QA verifies zero network requests from detection path.
- [ ] QA verifies no sensitive logcat output.
- [x] Automated instrumentation verifies owner isolation and purge primitives.
- [ ] Release owner completes Data Safety.
- [ ] Release owner verifies prominent disclosure.
- [ ] Release owner verifies package/developer identity.
- [ ] Product/privacy owners approve real-app fixture process.
- [ ] Pilot approval recorded with date and owners.

## Decision Log

| Date | Decision | Owner |
|---|---|---|
| 2026-07-25 | Local deterministic processing, no AI/server/analytics | Engineering direction |
| 2026-07-25 | No card/account identifiers | Product direction |
| 2026-07-25 | EUR card-payment pilot; reimbursements, income, transfers and P2P excluded | Product direction |
| 2026-07-25 | Pending candidates excluded from all backup/archive | Engineering direction |
| 2026-07-25 | DPIA screening required before real-user testing | Engineering/privacy gate |
| Pending | Lawful basis and role allocation | Privacy owner |
| Pending | Real-app fixture approval | Product + privacy owners |
