---
name: preflight-change
description: Establish exact-head Aura publication readiness: fresh base, complete diff/docs review, blast-radius profile, E2E fidelity and executor routing.
---

# Preflight Change

Immediately before publication:

1. Resolve material ambiguity from canonical code/docs/ADRs/tests.
2. Record the exact feature head and current intended base; invalidate stale evidence after rebase/edit/dependency changes.
3. Review the complete diff for unrelated/generated/private files, duplicated policy, weakened tests, stale docs and privacy/lifecycle drift.
4. Classify documentation impact separately for README identity, README usage, feature docs, architecture/ADR, security/data, operations, product experience and current state.
5. Run `scripts/select_validation_profile.py` and use the narrowest sufficient `LEAN|SCOPED|STRONG|FULL`; selector/global-build/toolchain changes force FULL.
6. For affected critical journeys choose the cheapest sufficient environment in `.engineering/e2e.json`; keep residual physical/device gaps explicit.
7. Classify every deterministic gate as `AGENT_LOCAL` or `REMOTE_AUTOMATED`; use `REAL_ENVIRONMENT` only for irreducible physical/protected/manual evidence.
8. Execute/reroute all required deterministic gates on the exact head. Never ask the user to run a gate merely because the agent lacks the toolchain.
9. Diagnose failed gates at their owner before repair/retry.

Readiness is truthful only when docs match exact-head behavior and every selected automated gate has passed; pending real-environment evidence still blocks claims that depend on it.
