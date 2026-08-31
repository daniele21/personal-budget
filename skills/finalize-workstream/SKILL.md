---
name: finalize-workstream
description: Close completed Aura workstreams by transferring only durable current truth and removing temporary planning state.
---

# Finalize Workstream

1. Confirm required slices/evidence are complete; unresolved required physical/device evidence keeps the workstream incomplete.
2. Inspect resulting code/contracts/tests, not the plan narrative.
3. Update only affected canonical owners: README identity or usage, architecture, specs/features, ADR, security/privacy, operations, design contract and current state.
4. Preserve README mission when only commands/features change, but update stale setup/run/configuration examples.
5. Transfer executable invariants to tests/tooling where practical; do not preserve PR/commit diaries.
6. Remove the workstream link from `docs/current-state.md` and delete the completed plan by default.
7. Check stale links/duplicate docs and run repository/docs/agent-context validation plus affected project gates.

Git history is the implementation history; active documentation describes the system as it exists now.
