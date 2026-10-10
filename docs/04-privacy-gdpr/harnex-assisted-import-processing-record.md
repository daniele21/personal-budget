# Harnex-Assisted Transaction Import V2 Processing Record — Draft For Privacy Owner

## Status

Engineering processing record updated for W12.3 deterministic-first Import V2. W13 privacy/legal/AI-governance owner approval remains pending. This is not an approved RoPA entry, legal interpretation, DPIA decision or GDPR certification.

ADR 0010 replaces ADR 0009's raw source-plan interpretation as the canonical wizard path. The previous broader raw-plan boundary remains historical and is not the data flow this candidate intends to ship.

## Processing activity and purpose

User-initiated import of a CSV/XLSX financial export.

Aura performs technical/resource safety checks, structural normalization and conservative semantic mapping locally. Familiar schemas are mapped without Harnex. Only when the local resolver cannot complete the schema may Aura call an explicitly authorized installed Harnex Android runtime to select among Aura-owned bounded schema candidates.

After a complete mapping is shown and the user continues, Aura executes/validates it deterministically. Category assistance remains optional and downstream. Canonical Review and verified commit remain Aura-owned.

Purpose: reduce manual reshaping/categorization while minimizing model exposure and preserving local execution, user control and deterministic financial semantics.

## Data categories

Aura may process locally:

- source spreadsheet structure and bounded sampled cell content;
- transaction date, description, amount and derived expense/income type;
- user-defined active category labels;
- local ledger description/category history used for conservative exact matching.

### Schema assistance boundary

The canonical schema request is the bounded semantic profile/candidate space, not a raw transformation-plan document.

It may include:

- opaque sheet/header/column/candidate IDs;
- bounded sheet/header labels;
- bounded column samples and structural ratios needed to distinguish candidate roles;
- Aura-owned date parser/amount candidate metadata;
- source kind and bounded structural metadata.

Harnex may return only advertised Aura candidate IDs or an ambiguous/unsupported result. Aura validates every returned selection.

It must not intentionally include:

- filename/path;
- Firebase UID/email/token;
- credentials/signing/authorization material;
- cloud-backup content;
- the complete Aura ledger;
- an unrestricted whole-workbook prompt;
- model-authored executable parser code.

The raw source-plan/revision/row-repair requests defined under ADR 0009 are retired from the canonical product journey.

### Category assistance boundary

Category inference may receive only opaque group IDs, normalized transaction description text needed for classification, expense/income type and ephemeral active-category IDs/labels. Date and amount remain excluded.

## Systems and flow

```text
user-selected CSV/XLSX
 -> Aura local technical/resource safety gates
 -> deterministic structural normalization + bounded profile
 -> Aura deterministic semantic resolver
      resolved   -> mapping summary
      unresolved -> optional local Binder Harnex candidate selection
                    -> Aura validates selected candidate IDs
 -> user Continue or Edit
 -> Aura deterministic extraction/validation
 -> local history category grouping
 -> optional bounded local Binder category batches
 -> Aura Review
 -> existing verified local transaction commit
```

Harnex cannot write Aura storage. Model output never directly becomes a transaction or ledger mutation.

## Recipients, processors and transfers

- remote recipient introduced: none;
- cloud AI provider introduced: none;
- international/network transfer introduced by this feature: none;
- local Android application/process boundary: Harnex, installed on the same device and explicitly authorized through caller/use-case policy.

No silent cloud fallback is allowed. Adding remote inference/content upload requires a successor product/privacy/security decision.

## Retention and logging

| Data | Retention contract |
| --- | --- |
| Source file/profile | Aura import session memory only |
| Harnex schema/category request content | operation/session only; prompt persistence is not authorized |
| Candidate mapping | import session only; not persisted in `Transaction` |
| Category/group candidate IDs | ephemeral import session only |
| Imported transactions | existing Aura canonical local retention after explicit commit |

Aura must not intentionally log filenames, sheet/header labels, sample cells, transaction descriptions, dates, amounts, categories, prompt/schema bodies or generated answers.

Aura may emit the existing content-free Import V2 diagnostic trace: ephemeral attempt ID, closed stage/result/failure codes, counts, request/schema sizes, capability limits and bounded timing/token metrics. Source values and generated content remain prohibited.

## Security and lifecycle controls

- Android UID/package/signer and explicit Harnex authorization govern access;
- release/debug Aura identities remain separate;
- schema output is JSON-schema constrained to Aura-owned candidate IDs and revalidated locally;
- local deterministic mapping resolves only one high-signal interpretation; competing meanings remain unresolved;
- explicit debit/credit pairs are one financial interpretation rather than several contradictory standalone amount choices;
- Harnex unavailable/unauthorized/model-unready has no cloud fallback and no hidden ledger mutation;
- generation remains cancellable with cleanup on close/cancel/failure;
- existing CSV/XLSX file/ZIP/formula/resource protections remain in force;
- existing verified commit/read-back/rollback remains canonical.

## Automated decision-making and user control

Harnex is advisory. For schema understanding it is invoked only after local deterministic resolution fails and may choose only Aura-owned candidates. The resulting mapping is shown to the user, who can Continue or Edit before deterministic extraction.

Category suggestions remain editable in Review. Only the user-confirmed Aura commit writes canonical transactions.

## Data minimization rationale for W12.3

W12.3 narrows the shipping source-understanding boundary compared with ADR 0009:

- familiar schemas require no Harnex schema call;
- quoted-row normalization happens locally before semantic resolution;
- unresolved schema assistance uses a bounded profile/candidate space rather than raw plan inference;
- raw proposal/revision/row-repair context is no longer sent by the canonical wizard;
- category requests remain separately minimized.

Re-review is required if raw source-plan inference is reintroduced, profile/sample limits materially expand, persistent learning is added, date/amount are added to category inference, or any network inference is introduced.

## Engineering evidence boundary

Integration evidence must verify:

- safe familiar schemas resolve without Harnex schema inference;
- unknown/ambiguous schemas invoke optional Harnex/manual fallback and fail closed;
- explicit debit/credit semantics collapse to one human-readable money choice;
- no mapped extraction occurs before user Continue;
- deterministic extraction precedes category assistance;
- Harnex/category failure leaves the ledger unchanged and Review usable;
- canonical transactions carry no Harnex/import provenance;
- diagnostics remain content-free;
- no cloud fallback exists.

This automated evidence does not substitute for privacy-owner governance or applicable physical release evidence.

## Owner actions before release

- confirm controller/processor/internal-system classification for local Harnex;
- confirm lawful basis/transparency wording and RoPA/data inventory;
- approve the narrowed schema-profile/sample boundary and content-free diagnostics;
- record DPIA/AI-governance screening outcome for ADR 0010/W12.3;
- confirm no Harnex prompt/output persistence is enabled for Aura use cases;
- confirm user-facing disclosure for optional schema/category assistance;
- re-review any future expansion listed above.
