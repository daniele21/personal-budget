import type { ArchiveIssue } from './archiveTypes';

export class ArchiveValidationError extends Error {
  readonly code = 'archive_validation_failed';

  constructor(readonly issues: ArchiveIssue[]) {
    super(issues[0]?.message ?? 'The Aura archive is invalid.');
    this.name = 'ArchiveValidationError';
  }
}

export class UnsupportedArchiveVersionError extends Error {
  readonly code = 'unsupported_archive_version';

  constructor(
    readonly kind: 'format' | 'schema',
    readonly version: number,
  ) {
    super(`Unsupported Aura archive ${kind} version: ${version}.`);
    this.name = 'UnsupportedArchiveVersionError';
  }
}

export class ArchiveIntegrityError extends Error {
  readonly code = 'archive_integrity_failed';

  constructor(readonly section: string) {
    super(`Aura archive integrity check failed for ${section}.`);
    this.name = 'ArchiveIntegrityError';
  }
}

export class ArchiveFormatError extends Error {
  readonly code = 'invalid_archive_format';

  constructor(message = 'The selected file is not a supported Aura archive.') {
    super(message);
    this.name = 'ArchiveFormatError';
  }
}

export class ArchivePassphraseRequiredError extends Error {
  readonly code = 'archive_passphrase_required';

  constructor() {
    super('This Aura archive requires a passphrase.');
    this.name = 'ArchivePassphraseRequiredError';
  }
}

export class ArchiveDecryptionError extends Error {
  readonly code = 'archive_decryption_failed';

  constructor() {
    super('The archive could not be unlocked. Check the passphrase and file integrity.');
    this.name = 'ArchiveDecryptionError';
  }
}

export class ArchiveBuildError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'ArchiveBuildError';
  }
}

export class RestoreError extends Error {
  constructor(readonly code: string, message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'RestoreError';
  }
}

export class RestoreRollbackError extends RestoreError {
  constructor(cause?: unknown) {
    super('restore_rollback_failed', 'Aura could not complete or safely roll back the restore.', cause);
    this.name = 'RestoreRollbackError';
  }
}
