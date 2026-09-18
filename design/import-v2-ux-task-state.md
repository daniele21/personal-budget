# Import V2 UX task/state contract

Status: ACTIVE — deterministic-first W12.3 contract. Canonical behavior is owned by the V2 spec and ADR 0010.

## User outcome

A user can import a safe CSV/XLSX statement without learning parser terminology. Aura resolves familiar schemas locally, asks Harnex only when schema meaning remains unresolved, and always preserves an editable manual path.

Nothing is written to the ledger before the existing Review and verified commit.

## Task model

`Upload -> Check preview -> Review -> Done`

Local profiling, optional Harnex fallback, transaction checks and category assistance are processing states inside those four user concepts. Binder lifecycle, model preparation, candidate IDs, parser names and batch budgeting are implementation details, not navigation.

## Critical journey

1. **Upload** — choose CSV/XLSX.
2. **Check preview** — Aura shows the complete date/description/money mapping it can safely use.
   - Familiar high-signal schema: resolved locally.
   - Missing semantic role: optional Harnex candidate selection.
   - Ambiguous/unavailable assistance: editable manual mapping.
   - User chooses **Continue** or **Edit**.
3. **Review** — Aura deterministically extracts/checks rows, applies local-history/optional category suggestions, then shows the existing transaction Review surface.
4. **Done** — only after verified commit succeeds.

## Mapping hierarchy

The summary uses human financial language:

- Date
- Description
- Money, e.g. `Uscite = expenses · Entrate = income`

Do not expose internal strategy identifiers such as `signed-negative-expense`, `debit-credit` or parser IDs as primary product copy.

When explicit debit/outflow and credit/inflow columns exist, present their pair as one interpretation. Do not also present each side as an independent amount choice.

The manual editor remains a recovery/advanced surface. It must still require a complete date + amount + description selection before continuing.

## State and recovery contract

| Runtime state | User meaning | Recovery |
| --- | --- | --- |
| upload/idle | No file chosen. | Choose file. |
| local-analysis | Aura is checking the file locally. | Cancel. |
| mapping resolved | A complete mapping is ready. | Continue, Edit, Cancel. |
| mapping ambiguous | User input is required. | Edit/confirm, Cancel. |
| assistance unavailable | Optional Harnex cannot resolve missing schema meaning. | Continue manually, Retry, Cancel. |
| checking transactions | Aura is applying the chosen mapping deterministically. | Cancel/close without commit. |
| category progress/partial failure | Suggestions are optional and may be incomplete. | Continue to Review, Retry where offered. |
| review | Canonical transaction data is editable/reviewable. | Existing Review controls. |
| success | Verified commit completed. | Done. |

No optional-assistance state may imply Harnex is required to finish an import.

## Accessibility/adaptive

- Critical meaning uses text plus semantics, never color alone.
- Processing uses labelled live/progress semantics and respects reduced motion.
- Mapping controls remain programmatically labelled with Android-friendly hit targets.
- Primary/secondary/destructive actions stay visually and semantically distinct.
- Narrow layouts stack actions/fields; text reflows under scaling.
- Material wizard changes require browser/Android `FULL_MEDIA` integration evidence; representative TalkBack/text-scaling remains release evidence when applicable.
