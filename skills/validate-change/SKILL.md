---
name: validate-change
description: Select the narrowest sufficient Aura validation while separating execution capability from environment fidelity.
---

# Validate Change

Read `.engineering/commands.json`; also read `.engineering/e2e.json` for complete workflows/platform claims and `design/*` for user-facing changes.

Use the cheapest gate that can falsify the change, then expand by blast radius:
- local/private owner: typecheck/lint + focused unit/component tests;
- direct consumers: contract/persistence/adapter tests;
- cross-boundary: canonical `check`, `test`, build and integration gates;
- complete critical journey: declared E2E at the cheapest sufficient fidelity;
- physical/OEM/signing/accessibility properties: real-environment evidence only when genuinely required.

`REMOTE_AUTOMATED` means the agent cannot execute a deterministic gate locally; it does not make the gate manual. Browser/emulator evidence never becomes physical-device evidence.

On failure classify regression, baseline, environment, flaky, base drift or wrong assumption; identify the owning invariant before editing again. Report PASS/FAIL/PENDING/N/A and the actual E2E environment/fidelity used.
