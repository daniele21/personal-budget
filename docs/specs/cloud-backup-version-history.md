# Cloud Backup Version History

## Purpose

Aura keeps a short encrypted Firestore history so a user can restore any of the
latest five valid cloud backups instead of being limited to the newest payload.

This transport remains distinct from Aura Portable Archive V1. Cloud backup
contains canonical `AppData`; it does not add receipt attachments or the portable
preference sections to Firestore.

## Storage Contract

- Each authenticated Firebase UID owns one metadata/compatibility document at
  `backups/{uid}` and at most five encrypted version documents at
  `backups/{uid}/versions/{versionId}`.
- Every newly created slot has a stable version ID, an ISO creation timestamp,
  AES-GCM ciphertext and IV, and a SHA-256 checksum of the plaintext payload.
- The root ciphertext fields temporarily mirror the newest version for backward
  compatibility; they are not a sixth backup.
- The parent keeps a bounded metadata index. Version creation, index update and
  pruning are committed in one Firestore transaction so concurrent devices do
  not lose a version.
- A sixth successful backup removes the oldest managed version document.
- Deleting the cloud backup enumerates and deletes all version documents,
  verifies the bounded index, and then deletes the parent.

Legacy single-slot and three-slot documents remain readable. Their Firestore
update timestamp is used as a fallback date when available, and the first
subsequent push migrates them idempotently into version documents.

## Restore Contract

- Aura validates the checksum, decrypts the payload locally, and structurally
  validates `AppData` before presenting a version.
- Corrupt or invalid slots are not offered in the version selector.
- The newest valid version is selected by default.
- An explicit version restore is exact: Aura never silently substitutes another
  slot if the selected version becomes unavailable or invalid.
- The legacy/default recovery path still tries the newest payload first and
  falls back through older slots when corruption prevents normal recovery.
- Restore replaces canonical local financial data after confirmation; it does
  not merge versions.

The selector is available both during empty-workspace recovery and from
`Data & Privacy`. When current local data exists, the confirmation explains
replacement and recommends exporting an Aura archive first if the user wants a
separate safety copy.

## Verification

Automated coverage must verify:

- transactional rotation retains only the latest five version documents;
- every new slot has a stable ID and creation date;
- listing returns up to five versions in newest-first order;
- selecting the previous version restores that exact payload;
- an invalid selected version fails without restoring a different version;
- the UI exposes all available dates and passes the selected version ID to restore;
- deletion and account deletion remove every version document before success;
- Firestore rules deny signed-out and cross-UID access to parent and versions.
