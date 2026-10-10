# Harnex-assisted Transaction Import V2

Status: **W12.3 deterministic-first simplification is the active integration candidate. W13 release qualification is paused until this material source/UX change is integrated and requalified.**

Active tracker: [workstream](../workstreams/harnex-assisted-transaction-import-v2.md). Durable decision: [ADR 0010](../../adr/0010-aura-deterministic-first-import-v2.md).

## User promise

Aura imports technically safe CSV/XLSX bank exports without forcing the user to understand parser internals.

The normal journey is:

```text
Upload -> Check preview -> Review -> Done
```

Aura first normalizes and understands what it can locally. Harnex is optional assistance for missing schema semantics and downstream category suggestions; it is not the default parser.

No source interpretation, category suggestion or model result writes the ledger. Only the existing verified Review/commit path can create canonical transactions.

## Canonical processing path

```text
selected file
 -> archive/legacy routing + local technical/resource safety gates
 -> V1 fast path when already canonical
 -> otherwise bounded local spreadsheet profile
 -> deterministic Aura semantic mapping
      resolved   -> mapping summary
      unresolved -> optional Harnex candidate selection
                    resolved -> mapping summary
                    ambiguous/unavailable -> manual editor
 -> explicit Continue or Edit
 -> Aura deterministic mapped extraction + validation
 -> local history category resolution
 -> optional bounded Harnex category classification
 -> Review
 -> verified commit
```

The raw Harnex transformation-plan/revision/row-repair flow from ADR 0009 is no longer part of the canonical wizard.

## Deterministic semantic mapping

Aura may auto-resolve a mapping only when one high-signal interpretation is provable from the bounded profile.

Initial deterministic vocabulary includes:

- dates: common/localized transaction-date labels plus an evidenced Aura date parser;
- descriptions: common/localized description, details, merchant/payee or causale labels;
- money:
  - explicit debit/outflow + credit/inflow columns;
  - amount + direction;
  - one-sided positive expense columns;
  - signed amount only when sampled signs provide evidence.

Unknown headers, competing date roles, multiple plausible tables or unsupported money shapes remain unresolved.

### Debit/credit dominance

When a header contains an explicit outflow/debit column and an explicit inflow/credit column, the candidate space exposes the pair as the financial interpretation.

For example:

```text
Data Operazione | Causale | Uscite | Entrate
```

maps locally to:

```text
Date        = Data Operazione
Description = Causale
Expenses    = Uscite
Income      = Entrate
```

Aura must not simultaneously ask the user whether `Uscite` or `Entrate` is a standalone signed amount.

## Harnex schema assistance

Harnex schema assistance is entered only when the deterministic resolver returns unresolved and Android Harnex is available/authorized.

The request remains bounded to Aura's semantic profile/candidate set. Harnex may select only advertised Aura candidate IDs. Aura validates the returned mapping through the canonical mapping resolver before showing it.

Harnex cannot:

- invent parser code, arbitrary regex, formulas or scripts;
- return final canonical transaction values;
- create categories;
- write the ledger;
- choose a cloud fallback.

Unavailable, unauthorized, malformed or ambiguous assistance leaves the manual mapping path usable.

## Mapping UX

A complete local or assisted mapping is shown as a concise summary:

- **Date**
- **Description**
- **Money** in human financial language

Primary action: **Continue**. Secondary action: **Edit**.

The editor remains the recovery surface but does not expose internal strategy identifiers. For explicit debit/credit statements it presents one option such as `Uscite = expenses · Entrate = income`.

After Continue, Aura executes and validates the selected mapping deterministically before category assistance or Review.

## Category assistance

Category behavior is unchanged:

- unambiguous local history wins first;
- unresolved description/type groups may be sent in bounded sequential batches to Harnex;
- only supplied active category IDs are accepted;
- failure/partial failure remains reviewable;
- no category is created silently.

## Invariants

- V1 remains the deterministic fast path;
- CSV/XLSX file, encoding, ZIP, formula, merge, row and resource protections stay Aura-owned;
- no cloud inference fallback;
- no whole ledger transfer;
- Harnex outputs are advisory and Aura-validated;
- source/mapping assistance state is session-only;
- diagnostics/logging remain content-free;
- duplicate detection, ledger fingerprint, undo and verified commit remain canonical;
- canonical `Transaction` records contain no Harnex/import provenance.

## Validation

This is a material product/UI/data-flow change. Integration requires selector-owned exact-head automated evidence, including affected browser and packaged Android journeys with `FULL_MEDIA`. Physical ARM64 production-model quality, OEM/resource behavior, production signer topology, TalkBack/text scaling and privacy-owner approval remain separate release evidence where applicable.
