# Feature documentation index

Aura already has durable feature/specification owners; do not create duplicate one-file-per-feature documentation merely for template symmetry.

Primary owners:
- `docs/specs/` — implementation/product specifications, including Android payment detection;
- `docs/feature_analysis.md` — broader feature analysis where still current;
- `README.md` — public/current capability summary;
- `docs/01-architecture/` and `/adr/` — cross-cutting architectural constraints and accepted decisions;
- `docs/04-privacy-gdpr/` — privacy/data-lifecycle behavior.

Create a new feature document here only when durable non-obvious current behavior has no stronger existing owner. If one is created, keep it under the feature-document budget in `.engineering/documentation-policy.json` and update this index.
