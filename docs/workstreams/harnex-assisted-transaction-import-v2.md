# Harnex-assisted Transaction Import V2

Status: ACTIVE — W12.3 deterministic-first simplification is in integration. W13 is paused until the new current-source candidate is integrated and requalified.

Canonical contracts: [V2 spec](../specs/harnex-assisted-transaction-import-v2.md), [ADR 0010](../../adr/0010-aura-deterministic-first-import-v2.md), [privacy record](../04-privacy-gdpr/harnex-assisted-import-processing-record.md).

## Goal and invariants

Make ordinary bank exports feel like import, not parser configuration.

Aura owns technical safety, structural normalization, deterministic semantic mapping when provable, mapped extraction, Review and canonical commit. Harnex is optional for unresolved schema roles and category suggestions.

No cloud fallback, model-generated executable parsing code, silent transaction creation or assistance-side ledger write is allowed. Ambiguity remains editable. Verified Review/commit remains the only canonical transaction writer.

## W12.3 outcome

Canonical journey:

```text
Upload
 -> local normalize/profile
 -> local mapping when provable
 -> Harnex schema fallback only when unresolved
 -> Check preview (Continue | Edit)
 -> deterministic extraction/checks
 -> category assistance
 -> Review
 -> verified commit
 -> Done
```

The user-facing step model is now four concepts: **Upload / Check preview / Review / Done**.

The quoted-row Italian statement used during diagnosis is expected to normalize locally and resolve as:

- `Data Operazione` -> date;
- `Causale` -> description;
- `Uscite` -> expenses/debit;
- `Entrate` -> income/credit.

That explicit debit/credit pair suppresses contradictory standalone amount options.

## Execution DAG

| ID | State | Acceptance |
| --- | --- | --- |
| W0-W12.2 prior implementation | DONE | Historical candidate/raw-interpretation implementation integrated. |
| W12.3.1 deterministic semantic resolver | ACTIVE | High-signal common/localized roles resolve locally; ambiguity stays unresolved. |
| W12.3.2 candidate/UX simplification | ACTIVE | Explicit debit/credit collapses to one money choice; technical strategy names stay out of product copy. |
| W12.3.3 canonical wizard convergence | ACTIVE | Raw plan interpretation is not entered by the wizard; Harnex schema assistance runs only after local unresolved. |
| W12.3.4 regression/E2E/docs | ACTIVE | Quoted-row/local-first, Harnex fallback, category Review, verified commit and privacy contracts agree. |
| W12.3.5 exact-head integration | BLOCKED | Selector-required web/browser/Android `FULL_MEDIA` gates pass on exact head/base. |
| W13 release qualification | BLOCKED | Regenerate current-source candidate after W12.3 integration, then execute applicable real-environment/privacy gates. |

## Validation strategy

This changes finance/import semantics, product UI and the Harnex data-flow boundary. Use selector `auto`; do not downgrade below its result. Material UI requires `FULL_MEDIA`.

When equivalent local npm/Android tooling is unavailable, required deterministic gates are `REMOTE_AUTOMATED` through repository-owned Repository Health. They are not user-run work.

Expected discriminating evidence:

- deterministic domain tests for local role resolution and fail-closed ambiguity;
- component tests proving obvious schemas do not call Harnex schema inference;
- manual fallback remains first-class for unknown schemas;
- explicit debit/credit editor has one human-readable money interpretation;
- category assistance remains downstream and cannot write before Review;
- packaged Android quoted-row journey reaches local mapping preview, then exercises real Harnex category assistance and verified commit;
- full diff/docs/privacy/E2E contracts are current.

## Release evidence

The Aura/Harnex Play Internal candidates recorded before W12.3 remain historical evidence only because product source and material UX changed. They must not be used to claim this branch release-qualified.

After integration, regenerate a current-source Aura candidate and refresh W13.1-W13.6 as applicable: production identity/authorization, physical sign-in, real ARM64 model quality for remaining Harnex use cases, performance/OEM behavior, TalkBack/text scaling and privacy/legal/AI-governance approval.
