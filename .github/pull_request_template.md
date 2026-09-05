## Outcome

Describe the user/system outcome and why this change is needed.

## Scope and ownership

- Delivery stage: `ITERATION | INTEGRATION -> dev | RELEASE -> main`
- Canonical owner(s):
- Material boundaries/consumers affected:
- Validation profile: `LEAN | SCOPED | STRONG | FULL`
- Risk dimensions / required gates:

## Documentation impact

- README identity: `UPDATED | N/A` —
- README usage: `UPDATED | N/A` —
- Feature docs: `UPDATED | N/A` —
- Architecture/ADR: `UPDATED | N/A` —
- Security/data lifecycle: `UPDATED | N/A` —
- Product experience: `UPDATED | N/A` —
- Current state: `UPDATED | N/A` —

## Validation

List exact-head evidence, not intended commands.

- [ ] Engineering baseline / `npm run check`
- [ ] Unit/integration tests
- [ ] Production/shared build when affected
- [ ] Critical-journey E2E when affected
- [ ] Android unit/Lint/build/instrumentation/WebView gates when affected
- [ ] `FULL_MEDIA` retained for material UI/UX integration journeys

E2E environment/fidelity used:

Residual `REAL_ENVIRONMENT` evidence (physical device/OEM/TalkBack/text scaling/approved real source/signing), if any:

For `INTEGRATION`, mark required residual target evidence `DEFERRED_TO_RELEASE`; do not make it a feature-to-`dev` blocker. For `RELEASE`, every applicable required residual gate must be closed before `RELEASE_READY`.

## Privacy, security and lifecycle

State any data/persistence/auth/backup/export/logging/credential/resource-lifecycle impact. Confirm synthetic/privacy-safe test evidence and zero-residue cleanup where applicable.

## Diff review

- [ ] Intended base/head are current
- [ ] Complete diff reviewed for unrelated/generated/private files
- [ ] No duplicated source of truth or silently weakened gate
- [ ] Affected durable docs match exact-head behavior
