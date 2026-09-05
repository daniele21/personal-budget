---
name: remote-preflight
description: Close Aura deterministic validation through repository-owned automation, reusing equivalent evidence before running missing stage-specific gates.
---

# Remote Preflight

Use after `preflight-change` identifies `REMOTE_AUTOMATED` gates.

- Read `.engineering/commands.json`, determine `INTEGRATION` vs `RELEASE`, and use the repository's stage-aware selector unless stronger validation is explicitly justified.
- Search for trusted equivalent evidence first. Before merge, reuse requires the exact current head plus equivalent target/base, required gates/profile and material E2E environment. After a content-preserving merge into `dev`, repository automation may reuse proof only when source tree and validated target/base remain equivalent.
- Trigger or observe `.github/workflows/repository-health.yml` for the exact current PR/head and confirm the reported stage, profile, risk dimensions and required gates.
- For `INTEGRATION`, close browser and Android-emulator gates automatically when selected. Material UI/UX journeys retain success screenshots/video. Required physical/OEM/TalkBack/real-source evidence remains `DEFERRED_TO_RELEASE` and must not be invented as an integration blocker.
- For `RELEASE`, do not claim readiness until every applicable required real-environment gap is separately satisfied in addition to FULL automated evidence.
- Inspect failing job/step logs; classify regression, baseline, environment, flaky, base drift or assumption before editing.
- Repair the owning cause, refresh head/base/diff/doc impact, reselect scope and rerun only missing, stale or insufficient evidence.
- Do not weaken tests, choose a weaker profile to escape failure, or delegate a deterministic command to the user.
- Keep change-branch execution read-only, without production/deployment/signing credentials; keep evidence bounded and tied to source revision.

If an automatable Android gate lacks a safe CI fixture/configuration path, report `AUTOMATION_CAPABILITY_GAP`; do not reclassify it as physical/manual evidence.
