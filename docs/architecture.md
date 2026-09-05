# Aura Finance architecture routing

Aura is an Android-first Capacitor application with a shared React/TypeScript financial domain and explicit native/cloud boundaries. This page is intentionally a compact routing owner; detailed architecture remains under `docs/01-architecture/` and accepted decisions under `/adr/`.

## Primary boundaries

1. **Shared product UI** — `src/pages/` and `src/components/` render the user-facing budgeting, transaction, reporting, recurring, search and settings experiences.
2. **Deterministic financial domain** — `src/domain/` owns financial calculations, reporting, recurring behavior, search/import rules and other business semantics that must not drift into transport/UI adapters.
3. **Local data** — browser storage/IndexedDB and their helpers own the canonical workspace and attachments used by the shared runtime.
4. **Platform adapters** — `src/platform/` isolates web/native capability differences so Android-specific behavior does not redefine canonical ledger semantics.
5. **Native Android** — `android/` owns Capacitor plugins, notification/payment-candidate detection, private native persistence, permissions and Android lifecycle integration.
6. **Optional Firebase boundary** — Firebase Authentication supports access identity and optional Firestore backup stores only client-side encrypted financial payloads according to the current privacy contract.
7. **Public web boundary** — landing/legal/support/account-deletion surfaces are public; the personal-finance application distribution target is Android.

## Invariants

- Local-first financial ownership is the default; cloud continuity is explicit and encrypted.
- Detected/imported data is reviewable and deterministic; payment candidates do not silently enter the ledger.
- Native/platform details remain behind typed boundaries rather than leaking into financial-domain policy.
- Debug and production Android identities/configuration/signing remain isolated and outside source control.
- Cross-layer changes inspect direct consumers, persistence/migration behavior and failure/recovery paths before publication.

For current product boundaries and release gaps read `README.md`, `docs/current-state.md`, `docs/00-discovery/14-consolidated-production-readiness-plan.md`, and the relevant files under `docs/01-architecture/`.
