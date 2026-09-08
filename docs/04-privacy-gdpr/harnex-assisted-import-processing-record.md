# Harnex-Assisted Transaction Import V2 Processing Record — Draft For Privacy Owner

## Status

Engineering contract draft, 2026-09-08. This is not an approved RoPA entry, legal interpretation, DPIA decision or GDPR certification. Runtime implementation is pending.

The privacy/legal owner must reconcile this record with the organization’s authoritative data inventory, role/lawful-basis register and DPIA process before general release.

## Processing activity and purpose

User-initiated import of a CSV/XLSX financial export. Aura parses/profiles the spreadsheet locally and may use an explicitly authorized installed Harnex Android runtime for on-device schema selection and transaction-category suggestions before user review and canonical local commit.

Purpose: reduce manual spreadsheet reshaping/categorization while preserving deterministic Aura parsing, user review and local-first financial ownership.

## Data categories

Aura may process locally:

- source spreadsheet structure and bounded sample cells;
- transaction date, description, amount and derived expense/income type;
- user-defined active category labels;
- local ledger descriptions/categories used for exact conservative history matching.

The initial Harnex boundary is minimized.

Schema inference may receive only opaque candidate/sheet/column IDs, bounded structural statistics/type hints, relevant labels and bounded representative sample cells. It must not receive the complete workbook, filename/path, Firebase UID/email/token, account/IBAN/card identifier, cloud backup or complete ledger.

Category inference may receive only opaque group IDs, transaction description text needed for classification, expense/income type and ephemeral active-category IDs/labels. Date and amount are excluded initially.

## Systems and flow

```text
user-selected CSV/XLSX
 -> Aura local file gates/read/profile
 -> Aura-generated schema candidates
 -> optional local Binder request to authorized Harnex use case
 -> JSON-schema-constrained candidate selection
 -> Aura deterministic extraction/validation
 -> Aura local history/category grouping
 -> optional local Binder category batches
 -> Aura review
 -> existing verified local transaction commit
```

The source file and complete ledger do not move into Harnex. Harnex cannot write Aura storage.

## Recipients, processors and transfers

- remote recipient introduced: none;
- cloud AI provider introduced: none;
- international/network transfer introduced by this feature: none;
- new Android application/process boundary: Harnex, installed on the same device and explicitly authorized through its caller-identity/use-case policy.

Whether the Harnex application boundary is represented as a separate internal recipient/system in the organization’s formal RoPA is a privacy-owner governance decision; engineering must not describe it as a remote subprocessor or external cloud transfer when it is operating locally.

No silent cloud fallback is allowed. Adding remote inference or content upload requires a successor privacy/security decision.

## Retention and logging

| Data | Planned retention |
|---|---|
| Source file/profile/mapping/review | Aura import session memory only |
| Harnex request content | operation/session only; Consumer contract does not authorize prompt persistence |
| Harnex generated result | consumed by Aura session; no canonical provider metadata persistence |
| Category/group candidate IDs | ephemeral import session only |
| Imported transactions | existing Aura canonical local retention after explicit commit |

Aura must not intentionally log filenames, sample cells, transaction descriptions, dates, amounts, categories or generated output. Harnex normal logs/telemetry for these use cases must remain content-free. Any optional Harnex sensitive-activity persistence outside the normal Consumer contract must be disabled/not used for this feature unless separately approved.

## Security and lifecycle controls

- Android UID/package/signer and explicit Harnex authorization govern access;
- release/debug Aura identities are separate consumers;
- JSON-schema-constrained output and Aura-side ID validation fail closed;
- model output cannot create parsing code/categories or write transactions;
- generation is cancellable; sessions/activations are cleaned on close/cancel/failure;
- Harnex unavailable/unauthorized/model-unready falls back to manual mapping/review, not cloud inference;
- existing spreadsheet file/ZIP/formula/resource protections remain in force;
- existing verified transaction commit/read-back/rollback remains canonical.

## Automated decision-making and user control

Harnex produces advisory schema/category suggestions. Aura does not permit a model to perform an irreversible or canonical financial action autonomously. Ambiguous schema interpretation requires user resolution, category suggestions remain reviewable, and only the user-confirmed Aura commit writes transactions.

The privacy owner must determine whether/how this advisory automation is described under applicable transparency/automated-decision governance; engineering does not claim a legal exemption.

## DPIA and governance screening

This feature processes financial context with generative AI, but the AI execution is local, user initiated, bounded, non-cloud and non-authoritative over the ledger. Engineering therefore records a new AI/cross-application processing boundary but no new remote recipient or systematic background monitoring.

A formal DPIA/AI-governance screening remains required by the privacy/product owner before general release because the repository’s existing legal role/lawful-basis/RoPA gaps remain unresolved and the feature introduces model-assisted processing of financial descriptions.

## Owner actions before release

- confirm controller/processor/internal-system classification for local Harnex processing;
- confirm lawful basis/transparency wording and RoPA/data-inventory entry;
- record DPIA/AI-governance screening outcome;
- approve data-minimization fields and content-free logging evidence;
- confirm no Harnex prompt/output persistence is enabled for Aura use cases;
- confirm user-facing unavailable/authorization/manual-fallback disclosure;
- re-review if date/amount/additional identifiers, persistent learning or any network inference are added.
