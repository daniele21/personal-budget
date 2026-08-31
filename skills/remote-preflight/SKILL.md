---
name: remote-preflight
description: Close deterministic Aura validation through repository-owned GitHub automation when the current agent lacks an equivalent local environment.
---

# Remote Preflight

Use after `preflight-change` identifies `REMOTE_AUTOMATED` gates.

- Read `.engineering/commands.json` and use the repository's `auto` blast-radius selection unless stronger validation is justified.
- Trigger/observe `.github/workflows/repository-health.yml` on the exact current PR/head and confirm the selected profile/reason.
- Inspect failing job/step logs; classify regression, baseline, environment, flaky, base drift or assumption before editing.
- Repair the owning cause, refresh head/base/diff/doc impact, reselect scope and let the exact-head workflow rerun.
- Do not weaken tests, choose a weaker profile to escape failure, or delegate the deterministic command to the user.
- Keep change-branch execution read-only, without production/deployment/signing credentials; keep evidence bounded and tied to source revision.

If an automatable Android gate lacks a safe CI fixture/configuration path, report an automation-capability gap rather than calling it physical/manual evidence.
