# Active workstreams

Use this directory only for substantial coordinated implementation that needs persistent dependency/progress state across sessions or parallel owners. Small coherent changes should not create a workstream.

Create an active file from `_template.md`, keep it within `.engineering/documentation-policy.json` budgets, and link it once from `docs/current-state.md` while active. Completed workstreams transfer durable current truth to code/tests/docs/ADRs and are deleted by default; Git history retains implementation chronology.
