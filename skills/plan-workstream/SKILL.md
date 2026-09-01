---
name: plan-workstream
description: Create a compact active execution DAG only when Aura work needs persistent dependencies, parallel ownership or multi-stage evidence.
---

# Plan Workstream

Use `docs/workstreams/_template.md` only for substantial coordinated work. Small coherent changes need no persistent plan.

1. Read the owning architecture/feature/current-state sources.
2. State one observable goal, non-goals and only material invariants.
3. Split work into vertical slices with stable IDs, `READY|ACTIVE|BLOCKED|DONE`, explicit dependencies and `Owns/writes` paths.
4. Put acceptance/validation beside each slice and name what is executable now.
5. Parallelize only non-conflicting write ownership or define an explicit integration point.
6. Link the active workstream once from `docs/current-state.md`.
7. At completion, transfer durable truth to code/tests/docs/ADRs and delete the workstream by default.

Keep the plan below `.engineering/documentation-policy.json` budgets; do not maintain implementation diaries or duplicate plan/progress/status files.
