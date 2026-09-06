# Aura Finance — Coding Agent Guide

Aura Finance is a private, Android-first personal-finance application. Preserve the product identity and privacy/local-first promises in `README.md`; ordinary engineering truth is owned by this repository.

## Durable invariants

- Ledger, budgets, reports, search and deterministic import logic remain local-first and canonically owned.
- No silent cloud fallback, AI financial advice/categorization, bank-account connectivity or admin plaintext access without an explicit product/security decision.
- Android payment detection creates review candidates; only explicit user confirmation creates canonical transactions.
- Optional cloud backup is opt-in and client-side encrypted; pending payment candidates stay outside backup/export unless a durable contract changes.
- Production and isolated Android debug Firebase/OAuth identities remain separate. Never commit credentials, keystores, signing material, `google-services.json` or local env files.

## Ownership

| Change | Owner | Inspect / prove |
| --- | --- | --- |
| Finance/import/search rules | `src/domain/` | deterministic domain tests |
| Local persistence | `src/data/` | migration/recovery tests |
| App orchestration | `src/context/`, `src/hooks/` | state/integration tests |
| Product UI | `src/pages/`, `src/components/` | browser/Android journeys |
| Native/web capability | `src/platform/`, `android/` | plugin/lifecycle/instrumentation tests |
| Product experience | `design/`, `brand-kit/` | UX/accessibility evidence |
| Durable decisions | `adr/`, `docs/` | owning docs/contracts |

Follow applicable scoped `AGENTS.md`; extend one canonical owner before adding state/policy and inspect material consumers when a shared boundary changes.

## Read by task

| Task | Read now |
| --- | --- |
| Pure docs/copy | affected source/links; `docs/README.md` only if ownership unclear |
| Behavior/bug/contract | `skills/structured-change/SKILL.md`, `skills/validate-change/SKILL.md`, relevant commands |
| Material UI | above + `skills/design-product-experience/SKILL.md`, relevant `design/*`/brand owners |
| Integration/release | `skills/preflight-change/SKILL.md`, commands, affected `.engineering/e2e.json` |
| Missing deterministic remote gate | `skills/remote-preflight/SKILL.md` |
| Persistent multi-session work | `skills/plan-workstream/SKILL.md` + active plan; finalize with `skills/finalize-workstream/SKILL.md` |

## Delivery and evidence

- **ITERATION**: cheapest owner-local checks; no exact-head/full-diff/docs/publication ceremony per edit.
- **INTEGRATION** (`feature PR -> dev`): exact candidate/base, complete diff, affected durable docs, required automated gates and affected critical E2E. Material UI/UX integration journeys require `FULL_MEDIA`. Physical/OEM/TalkBack/text-scaling/approved real payment-source evidence is `DEFERRED_TO_RELEASE`.
- **RELEASE** (`dev -> main`): `FULL` plus release-critical package/E2E/security and every applicable required physical/target-environment confirmation.

The selector resolves risks -> concrete gates -> profile; profiles are shorthand. Repository automation owns automatable browser/Android gates. Never turn the user into the Gradle/test runner because the current agent lacks tooling, and never present browser/emulator evidence as physical-device proof.

## Context, diagnosis and completion

`.engineering/documentation-policy.json` owns bounded context routes. Use `python3 scripts/verify_agent_context.py --route bug --format json`, optionally with `--path`/`--workstream`; routes estimate reading cost, not validation scope.

For meaningful work state observable outcome, owner, invariants and proof. Classify failures before patching. Each failed repair needs a falsifiable hypothesis; after two failed repairs with the same signature, change diagnostic strategy and gather new discriminating evidence before a third. On resume refresh head/tree/base; checkpoint evidence is a pointer, not current-source proof.

Before integration update affected canonical docs. Transfer durable truth and deferred release obligations before deleting completed plans. Never weaken privacy/security/payment/persistence invariants or suppress legitimate failed/pending gates to obtain PASS.
