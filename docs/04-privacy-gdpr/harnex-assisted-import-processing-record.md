# Harnex-Assisted Transaction Import V2 Processing Record — Draft For Privacy Owner

## Status

Engineering processing record, updated 2026-09-16 after W12.2 interactive raw interpretation was integrated through Aura PR #33 with deterministic FULL integration evidence. W13.6 privacy/legal/AI-governance owner approval remains pending. This document is not an approved RoPA entry, legal interpretation, DPIA decision or GDPR certification.

The privacy/legal owner must reconcile this record with the organization’s authoritative data inventory, role/lawful-basis register and DPIA/AI-governance process before general release.

## Processing activity and purpose

User-initiated import of a CSV/XLSX financial export. Aura performs technical/resource safety checks locally, retains a bounded source-shaped document view, and may use an explicitly authorized installed Harnex Android runtime for on-device interpretation of the source into an Aura-owned declarative transformation plan. Aura then executes that plan deterministically only for a representative preview, asks the user whether the interpretation is correct, and either confirms the exact proposal or sends structured corrective feedback for a revised local Harnex proposal.

Only a confirmed plan may be executed across the full source. Canonical transaction Review and verified commit remain Aura-owned.

Purpose: reduce manual reshaping/categorization of bank exports while preserving local execution, explicit user control, deterministic financial parsing and canonical Aura ownership.

## Data categories

Aura may process locally:

- source spreadsheet structure and bounded source row/cell content;
- transaction date, description, amount and derived expense/income type;
- user feedback about interpretation quality (for example date, amount/sign, description, table selection, missing transactions or row interpretation);
- user-defined active category labels;
- local ledger descriptions/categories used for exact conservative history matching.

The W12.2 Harnex schema/plan boundary is broader than the earlier candidate-ID-only design because source structure may be lost before semantic profiling. Harnex may therefore receive **bounded source-shaped row/cell content** needed to understand structure.

The schema/plan request may include:

- opaque sheet/row/proposal identifiers;
- bounded sheet labels where structurally useful;
- bounded source cell values from representative windows;
- structural metadata such as row counts, hidden/visible sheet state and merged-cell markers;
- the previous plan/proposal identity when revising;
- a closed structured feedback area supplied by the user.

It must not intentionally include:

- filename/path;
- Firebase UID/email/token;
- credentials, signing information or authorization tokens;
- bank account/IBAN/card identifiers intentionally extracted as metadata;
- cloud-backup content;
- the complete Aura ledger;
- an unrestricted whole-workbook prompt when bounded windows are sufficient.

Large sources remain bounded by Aura/Harnex capability limits. Additional source windows may be provided only when needed for interpretation/validation/repair; the whole file is not copied into one unconstrained model prompt.

Category inference remains narrower and may receive only opaque group IDs, transaction description text needed for classification, expense/income type and ephemeral active-category IDs/labels. Date and amount remain excluded initially from category requests.

## Systems and flow

```text
user-selected CSV/XLSX
 -> Aura technical/resource safety gates
 -> bounded source-shaped rows/cells in Aura session memory
 -> optional local Binder Harnex plan inference
 -> JSON-schema-constrained Aura declarative transformation plan
 -> Aura deterministic preview + source provenance
 -> explicit user Correct / Something is wrong decision
      Wrong -> structured feedback + bounded source context -> revised Harnex plan -> new preview
      Correct -> exact proposal becomes confirmed
 -> deterministic full-file execution with resolved/unresolved row accounting
 -> optional bounded Harnex exception repair for unresolved rows
 -> Aura local history/category grouping
 -> optional local Binder category batches
 -> Aura Review
 -> existing verified local transaction commit
```

Harnex cannot write Aura storage. Model output never directly becomes a transaction or ledger mutation.

## Recipients, processors and transfers

- remote recipient introduced: none;
- cloud AI provider introduced: none;
- international/network transfer introduced by this feature: none;
- new Android application/process boundary: Harnex, installed on the same device and explicitly authorized through its caller-identity/use-case policy.

Whether Harnex is represented as a separate internal recipient/system in the organization’s formal RoPA is a privacy-owner governance decision. Engineering must not describe local Harnex execution as a remote subprocessor or cloud transfer.

No silent cloud fallback is allowed. Adding remote inference/content upload requires a successor product/privacy/security decision.

## Retention and logging

| Data | Retention contract |
|---|---|
| Source file/raw document/profile | Aura import session memory only |
| Harnex request content | operation/session only; Consumer contract does not authorize prompt persistence |
| Proposed transformation plan/preview | Aura import session memory only |
| User interpretation feedback | Aura import session memory only; not persistent learning |
| Confirmed plan | import session only; not persisted in `Transaction` |
| Unresolved-row repair context | operation/session only |
| Category/group candidate IDs | ephemeral import session only |
| Imported transactions | existing Aura canonical local retention after explicit commit |

Aura must not intentionally log filenames, sheet/header labels, source/sample cells, transaction descriptions, dates, amounts, categories, user free-form financial feedback, prompt/schema content or generated output. Harnex normal logs/telemetry for these use cases must remain content-free. Any optional Harnex sensitive-activity persistence outside the normal Consumer contract must be disabled/not used unless separately approved.

Aura may emit a **content-free Import V2 diagnostic trace**. Its fields remain limited to an ephemeral attempt ID, closed stage/result/failure/ambiguity/feedback-area codes, counts, request/schema character counts, capability limits and bounded timing/token metrics. The bounded trace stays in session memory and may be mirrored to runtime console for troubleshooting. Adding source values, preview rows, plan bodies, descriptions, dates, amounts, categories, prompt/schema bodies or generated answers to diagnostics is prohibited.

## Security and lifecycle controls

- Android UID/package/signer and explicit Harnex authorization govern access;
- release/debug Aura identities are separate consumers;
- all Harnex output is JSON-schema constrained and Aura validates plan/source references fail-closed;
- Harnex may choose only Aura-owned declarative transformation primitives, never code/scripts/arbitrary regex;
- proposal preview is generated by Aura’s deterministic executor, not by directly trusting a model-authored transaction list;
- full-file execution requires explicit confirmation of the exact proposal identity;
- changing/rejecting a proposal invalidates prior confirmation;
- every candidate row must be resolved or explicitly unresolved; no silent drop/invention;
- generation is cancellable and sessions/activations are cleaned on close/cancel/failure;
- Harnex unavailable/unauthorized/model-unready has no cloud fallback and no hidden ledger mutation;
- existing CSV/XLSX file/ZIP/formula/resource protections remain in force;
- existing verified transaction commit/read-back/rollback remains canonical.

## Automated decision-making and user control

Harnex produces advisory interpretation/category proposals. Aura does not permit a model to perform an irreversible or canonical financial action autonomously.

For source interpretation, explicit user feedback is mandatory before Harnex-derived semantics can be applied to the complete file:

- **Correct** confirms that exact proposal;
- **Something is wrong** blocks full execution and asks for structured corrective feedback/revision.

Each revised proposal requires a new preview and confirmation. Harnex self-reported confidence cannot bypass this gate.

Category suggestions remain reviewable in the existing transaction review flow. Only the user-confirmed Aura commit writes canonical transactions.

The privacy owner must determine whether/how this advisory automation and feedback loop is described under applicable transparency/automated-decision governance.

## Data minimization rationale for W12.2

The earlier candidate-ID-only boundary minimized content further but was insufficient for source structures that Aura had already flattened or constrained before Harnex could reason about them. W12.2 permits bounded raw/source-shaped content because understanding unknown financial-export structure requires some semantic evidence from the actual rows.

Minimization is preserved by:

- retaining only bounded representative rows/cells for plan inference;
- clamping cell content length;
- excluding filename/auth/account/ledger metadata;
- using a declarative plan so the model need not receive every transaction merely to normalize a regular file;
- executing the confirmed global plan deterministically in Aura;
- sending only unresolved-row context for optional repair instead of resubmitting all successfully resolved rows.

This boundary must be re-reviewed if limits increase materially, a whole file is sent routinely, additional identity/account fields are added, or feedback becomes persistent learning.

## Engineering evidence boundary

Automated integration evidence for W12.2 must verify at least:

- technical rejects remain local and no unsafe source reaches Harnex;
- unusual safe source shapes can reach bounded interpretation;
- invalid/unknown plan primitives and source references fail closed;
- no full-file plan execution occurs before explicit user confirmation;
- user rejection invalidates prior confirmation and creates a new proposal/preview gate;
- row accounting has no silent loss/invention;
- Harnex unavailable/cancelled leaves the ledger unchanged;
- category outputs remain limited to supplied IDs;
- canonical committed transactions carry no Harnex/import provenance;
- diagnostics/logs remain content-free;
- no cloud inference fallback exists.

This evidence does not substitute for the privacy-owner governance actions below or physical release evidence.

## DPIA and governance screening

This feature processes financial context with generative AI, but inference is local, user initiated, bounded, non-cloud and non-authoritative over the ledger. W12.2 increases the amount of raw financial content that may cross the local Aura/Harnex process boundary compared with the earlier candidate-only design and adds interactive user feedback as model input.

A formal DPIA/AI-governance screening therefore remains required before general release. The broader source-content boundary must be explicitly reviewed rather than relying on the earlier W12 assessment.

## Owner actions before release

- confirm controller/processor/internal-system classification for local Harnex processing;
- confirm lawful basis/transparency wording and RoPA/data-inventory entry;
- review/approve bounded raw source content and feedback minimization;
- record DPIA/AI-governance screening outcome for ADR 0009/W12.2;
- approve content-free logging/diagnostic evidence;
- confirm no Harnex prompt/output/feedback persistence is enabled for Aura use cases;
- confirm the user-facing interpretation preview/feedback disclosure;
- re-review if raw limits expand materially, whole-file prompting becomes routine, date/amount are added to category inference, persistent learning is introduced or any network inference is added.