# Import V2 UX task/state contract

Status: ACTIVE — W5 isolated contract. Central wizard integration belongs to W6/W10.

## User outcome

A user can import a reasonably structured CSV/XLSX statement without knowing Aura's fixed column names. Aura explains what it understands, asks for confirmation when structure is ambiguous, and always preserves a manual path when optional assistance is unavailable.

Nothing in this contract changes canonical extraction, duplicate detection, review or ledger commit semantics.

## Task model

`Upload -> Understand file -> Check transactions -> Categorize -> Review -> Done`

The UI names the user's task. Binder, host lifecycle, model/runtime preparation, request batching and payload budgeting are implementation details and must not become the primary navigation or progress model.

## Critical journey and hierarchy

1. **Upload** — user chooses CSV/XLSX.
2. **Understand file** — Aura profiles sheets/headers/sample values locally. A suggested mapping is never silently authoritative; ambiguous mappings require explicit review and all mappings remain editable before confirmation.
3. **Check transactions** — confirmed candidate IDs feed Aura-owned deterministic extraction/validation.
4. **Categorize** — optional category assistance may make suggestions. Partial results remain reviewable.
5. **Review** — existing Aura review/duplicate/verified-commit owner remains canonical.
6. **Done** — success is reported only after the existing verified commit succeeds.

Primary action hierarchy:

- mapping state: `Confirm mapping` only when date, amount and at least one description candidate are selected;
- unavailable/partial state: `Continue manually` is primary and `Retry` is secondary;
- long-running optional work: `Cancel` remains reachable;
- no state may imply that optional assistance is required to finish the import.

## State contract

The isolated implementation lives under `src/components/import/v2/` and is testable without a real Harnex host.

| State | User meaning | Required recovery |
| --- | --- | --- |
| `idle` | No file selected yet. | Choose a file. |
| `local-analysis` | Aura is reading structure locally. | Cancel. |
| `mapping-review/resolved` | Aura has a suggestion, but user confirmation is still required. | Edit or confirm; cancel. |
| `mapping-review/ambiguous` | Multiple interpretations remain. | Explicitly edit/confirm; never auto-advance. |
| `checking-transactions` | Aura is deterministically applying the confirmed mapping. | Cancel. |
| `assistance-unavailable` | Optional assistance cannot currently help. Reasons include host missing/unreachable, unauthorized, task unready, runtime preparing, offline or generic unavailable. | Continue manually, retry, cancel. |
| `classification-progress` | Optional category suggestions are in progress. | Cancel and continue without waiting. |
| `classification-partial-failure` | Some suggestions completed and some failed. | Keep completed work reviewable; retry or continue manually. |
| `cancelled` | Optional/current import work stopped before commit. | Retry or continue manually where meaningful. |
| `review` | User must inspect canonical transaction data before commit. | Existing Review owner controls edits/commit. |
| `success` | Existing verified commit completed. | None. |

The state model uses Aura-generated candidate IDs (`dateCandidateId`, `amountCandidateId`, `descriptionColumnIds`, optional `typeColumnId`). It does not own parser strategies or Harnex response semantics; W2/W6/W7 remain the owners of those boundaries.

## Privacy and disclosure

- File profiling and mapping are described as on-device work.
- Optional assistance failure never triggers a cloud fallback.
- UI copy must not claim that a transaction is imported before Review/verified commit.
- Diagnostic implementation details may be exposed only in secondary diagnostics where justified, not as the primary user task model.

## Adaptive and accessibility contract

- Critical meaning uses text plus icon/semantics, never color alone.
- Loading/progress states expose `aria-busy`/live progress semantics; category progress uses a labelled progress element.
- Ambiguous/unavailable/partial failures use alert semantics and actionable recovery.
- Mapping inputs have programmatic labels; description columns use labelled checkboxes.
- Primary/secondary/cancel actions remain reachable by keyboard and visible focus styles inherited from canonical controls.
- Layout stacks on narrow/mobile widths and may use two-column grouping only when space allows.
- Controls retain Android-friendly minimum hit targets through existing Aura controls.
- Loading motion respects reduced-motion (`motion-reduce`).
- Text must reflow rather than depend on fixed-height containers; packaged-app text-scaling/TalkBack qualification remains release evidence when the integrated journey is affected.

## Validation boundary

W5 evidence is component/state focused:

- pure transition tests cover explicit mapping confirmation, incomplete mapping blocking, manual fallback, partial failure, retry and cancellation;
- component tests cover editable ambiguous mapping, resolved-but-explicit confirmation, local-processing disclosure, unavailable recovery, progress semantics and partial failure;
- real Harnex is not required for W5 tests;
- full wizard FULL_MEDIA and packaged Android journey evidence belongs to G2/W10 unless the validation selector escalates this isolated lane.
