# Gemini Retirement Record

Status: implemented in application code; remote-rule follow-up open.

Last reviewed: 2026-08-03.

## Scope completed

Aura's deterministic transaction import no longer contains or imports the
Google GenAI SDK, model configuration, provider prompts, usage logger, model
selector, usage dashboard, client API-key variable, or Android debug override.
The import path remains local and does not send file rows to Firebase,
analytics, an AI provider, or another network destination.

The retired browser cache namespace is exactly
`gemini_import_cache_v6_<sha256>`, where `<sha256>` was derived by the former
client. Startup performs a bounded best-effort scan for the exact prefix
`gemini_import_cache_v6_` and removes only matching keys. It does not use a
general `gemini*` deletion and does not touch transaction, archive, preference,
identity, Firebase, or older unrelated cache keys.

## Personal data and vendor impact

No new personal data, recipient, transfer, subprocessor, retention period or
administrator access is introduced. Removing the provider path reduces future
exposure of transaction descriptions and amounts. Existing imported
transactions remain ordinary local transactions and retain their current
deletion, export and opt-in encrypted-backup behavior.

This engineering record is not a GDPR compliance certification or legal
advice. The repository still lacks the complete legal-governance baseline
required by `AGENTS.md`; the privacy owner must resolve that separately.

## Historical Firestore collections

The existing `geminiConfig` and `geminiUsage` documents are not read by the
application UI after this change and are not deleted, exported, migrated or
otherwise mutated by M5. Their content, volume and retention state were not
inspected during implementation.

Current Firestore rules still expose the historical paths according to the
previous authenticated/admin policy. A separate, reversible Firestore-rules
migration is required before claiming the remote surface is retired. The
recommended migration is to deny all new reads and writes to both collections,
deploy and verify the rule change independently, then let the privacy/data owner
decide retention or deletion through an explicitly authorized process.

Follow-up owner: product/privacy owner together with the Firebase operator.
Release gate: decide and record whether the rule migration is required before
public release; do not delete historical documents without explicit approval.

## Verification

- structural tests reject AI-provider, Firebase, analytics, `fetch` and
  `XMLHttpRequest` dependencies in production import modules;
- structural tests reject restoration of deleted provider/config/admin modules;
- the production build and bundled Android assets are scanned for SDK names,
  client-key variables, provider endpoints, model IDs and retired admin CTA;
- the normal TypeScript, Vitest, production-build and import E2E gates remain
  required.
