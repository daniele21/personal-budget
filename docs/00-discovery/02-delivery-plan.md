# Delivery Plan

## Current Implementation Slice

- Add explicit cloud backup opt-in and status in Profile.
- Correct privacy copy to mention optional encrypted Firestore backup.
- Preserve categories through archive/restore instead of destructive deletion.
- Add savings goals as real persisted data.
- Add first-run onboarding for budget, categories, backup opt-in, and optional goal.
- Make Reports explicitly support weekly and monthly analysis.
- Remove unused AI dependency and environment references.

## Quality Gates

- Typecheck with `npm run lint`.
- Unit tests with `npm run test`.
- Production build with `npm run build`.

## Privacy And Security Checks

- Financial data remains local unless cloud backup is explicitly enabled.
- Cloud backup payload is encrypted before Firestore write.
- Admin scope remains access allowlist management, not financial data access.
- No AI provider or model dependency remains in application scope.

## Follow-Up Candidates

- Migrate categories from string names to stable IDs with archived metadata.
- Add schema validation for LocalStorage, CSV import, and backup restore payloads.
- Improve PWA offline behavior and update/install lifecycle.
- Add user-facing export for report summaries.
