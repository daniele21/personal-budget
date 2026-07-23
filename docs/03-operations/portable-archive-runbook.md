# Portable Archive Operational Runbook

## Scope

This runbook covers Aura Portable Archive V1 export, import, restore recovery, rollback, and safe support diagnostics. The feature is browser-local and adds no backend job, environment variable, provider, database migration, or usage-based service.

## Deployment Prerequisites

- deploy the domain, repository, service, recovery-gate, and UI changes in the same client bundle;
- do not ship restore UI without `RestoreRecoveryGate` wrapping auth and data providers;
- confirm the production origin permits Web Crypto, localStorage, IndexedDB, Blob downloads, and service-worker reload behavior;
- run TypeScript, Vitest, production build, and the recovery acceptance scenario;
- confirm production build logs show the normal Firebase auth runtime; never deploy or host the local `npm run dev:e2e` server;
- verify light/dark, keyboard, reduced-motion, narrow mobile widths, installed PWA, and the 32 MiB mobile target on supported real browsers.

No configuration or data migration is required. Existing local data remains in its current canonical keys until the user explicitly restores an archive.

The browser-test identity is a compile-time development-server adapter, not a Firebase account or runtime feature flag. Vite rejects `build --mode=e2e`, and E2E serve mode binds only to `127.0.0.1:4173`. If either guard changes, treat it as a security-sensitive release change.

## Expected Restore Journal

The local journal key is `aura_restore_journal_v1`. The coordination flag is `aura_restore_in_progress`. Large previous and target snapshots and target attachments use restore-scoped IndexedDB keys beginning with `aura_restore/`.

Normal completion removes the journal, coordination flag, and all restore-scoped staging records. Canonical attachment keys remain `attachment_<transactionId>`.

## Startup Recovery

- pre-commit states discard target staging because canonical data is unchanged;
- committed target core resumes target attachment promotion and verifies the complete target;
- ambiguous or failed states restore the previous snapshot and verify it;
- verified/completed states finish cleanup;
- failed recovery keeps the journal and coordination flag, blocks normal provider hydration, and shows the retry screen.

Do not advise users to clear localStorage or IndexedDB while the recovery screen is present. That would remove the rollback evidence.

## Support Diagnostics

Safe diagnostics:

- error code or error class;
- archive byte size;
- encrypted/plaintext mode;
- format and schema version;
- service phase or journal status;
- browser name/version and installed-PWA state;
- whether the recovery retry succeeds.

Never request or log:

- archive passphrases;
- archive files or decrypted payloads through ordinary support channels;
- transaction descriptions, reminder text, account details, receipt images, UID, or email;
- raw localStorage/IndexedDB dumps.

## Failure Response

### Export fails

1. Record the typed error code and archive size.
2. Resolve reported missing, invalid, or oversized referenced attachments.
3. Confirm sufficient device memory and browser download permission.
4. Retry without changing current Aura data. Export failures are non-destructive.

### Import preflight fails

1. Confirm binary signature, file size, version, and passphrase entry.
2. Do not rename or edit the archive.
3. Existing Aura storage is unchanged; retry with the original file.

### Restore fails and rollback succeeds

The service returns a restore error explaining that existing data was recovered. Reload Aura and verify the previous workspace. Retain both the imported archive and downloaded safety archive.

### Startup recovery remains blocked

1. Keep the tab and browser profile intact.
2. Retry from the recovery screen once.
3. Record only safe diagnostics above.
4. Escalate to engineering before clearing browser storage.

## Deployment Rollback

The application bundle can be rolled back without a schema downgrade because normal data keys are unchanged. However, do not serve an older bundle to a browser that may have an active V1 restore journal: the older bundle cannot run startup recovery.

Safe rollback procedure:

1. stop new restore initiation at the UI or wait for active restore operations to finish;
2. confirm no reported clients remain on the recovery screen;
3. deploy the previous client bundle;
4. preserve user-created `.aura` files; rollback does not invalidate V1 archives;
5. if emergency rollback cannot wait, keep the current recovery-capable bundle available at a support URL until affected clients finish recovery.

## Post-Release Watch

- archive build/decrypt/restore error-code distribution, only if privacy-safe client telemetry already exists;
- reports of blocked downloads, memory pressure, quota failures, or repeated recovery retries;
- cloud-backup overwrite reports during restore;
- mobile/PWA reload behavior after verified restore;
- bundle-size and initial-load regression.

No new admin cost panel is required: V1 makes no provider, storage, or AI calls. Browser CPU, memory, archive size, and bundle size are the relevant operational cost indicators.
