# ADR 0010: Deterministic-first Import V2

- Status: Accepted
- Date: 2026-09-18
- Relates to: ADR 0002, ADR 0006, ADR 0008, ADR 0009
- Supersedes: ADR 0009 for the canonical source-understanding flow. Its no-cloud, explicit-review and verified-commit invariants remain in force.

## Context

The interactive raw-source interpretation introduced by ADR 0009 made unusual bank exports safe and explainable, but it also made Harnex responsible for layout, semantic roles, amount strategy, revision and row repair before Aura could continue. In the real user flow this complexity leaked into recovery: a familiar four-column statement could fall through to a manual selector containing several technically valid but contradictory amount strategies.

Aura already has deterministic structural normalization for safe CSV/XLSX inputs, including quoted rows whose single outer cell contains a repeated delimiter. For common schemas, headers and sampled value shapes are sufficient to resolve date, description and money roles without a model.

## Decision

Aura uses a **deterministic-first mapping boundary**:

```text
selected CSV/XLSX
 -> local technical/resource safety gates
 -> deterministic structural normalization/profile
 -> conservative Aura semantic resolver
      resolved   -> user mapping summary
      unresolved -> optional Harnex candidate selection
                    resolved -> user mapping summary
                    unresolved/unavailable -> manual mapping
 -> user Continue or Edit
 -> deterministic full-row extraction/validation
 -> optional category assistance
 -> Review
 -> existing verified commit
```

### Aura owns structure and ordinary semantics

Aura locally owns:

- CSV/XLSX safety/resource gates and quoted-row structural normalization;
- candidate construction and the closed parser/amount strategy vocabulary;
- deterministic resolution when one high-signal interpretation is provable;
- deterministic extraction, row validation, duplicate/history authority and ledger commit.

The local resolver is deliberately conservative. It may resolve familiar date/description labels and explicit money semantics such as `Uscite + Entrate` / `Debit + Credit`. Competing date fields, unknown semantic headers or unsupported money shapes remain unresolved.

When explicit debit and credit columns are present, Aura exposes the pair as one debit/credit interpretation. It does not simultaneously expose each side as standalone signed-amount alternatives.

### Harnex is an optional gap resolver

Harnex is not the primary source parser. It is invoked for schema understanding only when the deterministic resolver cannot complete the mapping.

Schema assistance receives the existing bounded semantic profile/candidate space and may select only Aura-owned candidate IDs. Aura re-validates every returned selection. It cannot invent a parser, amount strategy, transaction value or executable code.

The raw transformation-plan/revision/row-repair path from ADR 0009 is retired from the canonical product journey. Its implementation may remain temporarily as non-canonical code while cleanup/rollback risk is evaluated, but new product behavior and validation must not depend on it.

Category assistance remains a separate downstream capability and may still use Harnex after deterministic transaction extraction.

### User task model

The import journey exposes four user concepts:

1. **Upload**
2. **Check preview**
3. **Review**
4. **Done**

Local analysis, Harnex fallback, row checks and categorization are processing states inside those concepts rather than separate wizard stages.

A complete mapping is shown in human financial language: date column, description column(s), and how money in/out is represented. Internal strategy names such as `signed-negative-expense` are not product copy.

The user can **Continue** or **Edit** the mapping. No mapping, category suggestion or model result writes the ledger. Review and the existing verified commit remain mandatory.

## Safety and privacy invariants

- no cloud inference fallback;
- Harnex cannot write Aura storage or the ledger;
- no model-generated executable parser/code;
- candidate IDs and full-row execution remain Aura-owned;
- ambiguous/unavailable assistance falls back safely to user-editable mapping;
- diagnostics remain content-free;
- source/mapping assistance state remains session-only;
- only the existing verified Aura commit creates canonical transactions.

Compared with ADR 0009, the canonical schema-assistance path sends less source-shaped content because raw plan inference is no longer entered by the wizard.

## Consequences

- deterministic semantic mapping becomes the first owner after local profiling;
- explicit debit/credit columns collapse to one money interpretation;
- Harnex schema inference becomes conditional rather than the default Android path;
- the raw plan/row-repair modules are no longer canonical and can be removed in a later cleanup after integration confidence;
- the wizard and Android E2E contract move to the four-step task model;
- prior W13 release candidates are historical evidence only after this material source/UX change; current-source qualification must be regenerated after integration.
