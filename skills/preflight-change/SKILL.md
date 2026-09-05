---
name: preflight-change
description: Establish Aura integration or release readiness with stage-aware exact-head evidence, risk-selected gates and explicit environment fidelity.
---

# Preflight Change

Use this when an observable outcome is ready to leave private iteration.

1. Resolve material ambiguity from canonical code, docs, ADRs and tests.
2. Identify the delivery stage:
   - `INTEGRATION` for a feature/PR moving into `dev`;
   - `RELEASE` for `dev` moving into `main` or a release candidate.
3. Record exact feature head and current intended base; invalidate stale evidence after edits, rebase, dependency changes or material base drift.
4. Review the complete diff for unrelated/generated/private files, duplicated policy, weakened tests, stale docs and privacy/lifecycle drift.
5. Classify documentation impact separately for README identity, README usage, feature docs, architecture/ADR, security/data, operations, product experience and current state.
6. Run `scripts/select_validation_profile.py --base-ref <base> --head-ref <head> --stage <integration|release>` and use the reported risk dimensions and required gates. `LEAN|SCOPED|STRONG|FULL` are summaries, not substitutes for the concrete gates.
7. For affected critical journeys choose the cheapest sufficient automated environment in `.engineering/e2e.json`.
8. For material UI/UX integration outcomes require `FULL_MEDIA`: bounded screenshots plus continuous journey video. Incidental UI may remain assertion-only.
9. Classify every deterministic gate as `AGENT_LOCAL` or `REMOTE_AUTOMATED`; use `REAL_ENVIRONMENT` only for irreducible physical/protected/manual evidence.
10. Execute or reroute all required automated gates on the exact head. Never ask the user to run an automatable gate merely because the agent lacks the toolchain.
11. Diagnose failed gates at their owning invariant before repair/retry.

## Readiness semantics

At `INTEGRATION`, all required automated evidence must pass. A required physical/OEM/TalkBack/text-scaling/approved real payment-source confirmation is recorded as `DEFERRED_TO_RELEASE` and **does not block the PR into `dev`**. Report this state as `AUTOMATED_PREFLIGHT_CONFIRMED`, not as release readiness.

At `RELEASE`, FULL validation and release-critical E2E/artifact evidence are required. Every applicable journey with `real_environment_confirmation: required` must close its residual target-environment gap before `RELEASE_READY`.

Never promote browser or emulator evidence into a physical-device claim.
