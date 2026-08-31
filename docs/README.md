# Aura Finance documentation map

This directory routes durable current truth. Prefer updating an existing owner over creating a parallel document.

| Topic | Canonical owner |
| --- | --- |
| Product identity, value, public setup/run and high-level status | `README.md` |
| Repository engineering/agent rules | `AGENTS.md`, `.engineering/*`, `skills/*` |
| Current architecture routing | `docs/architecture.md` plus `docs/01-architecture/` |
| Current integrated state and material gaps | `docs/current-state.md` |
| Product discovery/readiness decisions | `docs/00-discovery/` |
| Operations/runbooks | `docs/03-operations/` |
| Privacy/GDPR/data lifecycle | `docs/04-privacy-gdpr/` and `SECURITY.md` |
| QA strategy/evidence | `docs/testing-strategy.md`, `docs/07-qa/` |
| Feature/specification detail | `docs/specs/`, indexed by `docs/features/README.md` |
| Accepted architecture decisions | `/adr/`, indexed by `docs/adr/README.md` |
| Active coordinated implementation only | `docs/workstreams/` |
| Brand source | `brand-kit/brand-guidelines.md` and assets |
| UX/brand machine-readable contract | `design/` |

## Lifecycle rules

README identity and usage are separate concerns: do not rewrite valid mission/positioning for a usage-only change, but never leave stale setup/run/configuration examples. Completed workstream plans are deleted by default after durable behavior/decisions are transferred to code, tests, ADRs or the canonical docs above. Release evidence belongs under the existing release/QA owners only when it has continuing audit value.
