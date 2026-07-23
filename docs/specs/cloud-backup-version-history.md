# Cloud Backup Version History

## Purpose

Aura keeps a short encrypted Firestore history so a user can restore the latest,
previous, or third-latest cloud backup instead of being limited to the newest
valid payload.

This transport remains distinct from Aura Portable Archive V1. Cloud backup
contains canonical `AppData`; it does not add receipt attachments or the portable
preference sections to Firestore.

## Storage Contract

- Each authenticated Firebase UID owns one document at `backups/{uid}`.
- The document contains at most three distinct encrypted slots, newest first.
- Every newly created slot has a stable version ID, an ISO creation timestamp,
  AES-GCM ciphertext and IV, and a SHA-256 checksum of the plaintext payload.
- The root ciphertext fields mirror the newest slot for backward compatibility;
  they are not a fourth backup.
- Rotation is committed in a Firestore transaction so concurrent devices cannot
  lose a version between the history read and write.
- A fourth successful backup removes the oldest slot.
- Deleting the cloud backup deletes the document and all three versions.

Legacy single-slot documents remain readable. Their Firestore update timestamp
is used as the version date when available, and the first subsequent push
migrates them into the three-slot shape.

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

- transactional rotation retains only the latest three slots;
- every new slot has a stable ID and creation date;
- listing returns the three versions in newest-first order;
- selecting the previous version restores that exact payload;
- an invalid selected version fails without restoring a different version;
- the UI exposes all three dates and passes the selected version ID to restore.
