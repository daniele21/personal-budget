import { AURA_ARCHIVE_SCHEMA_VERSION } from './archiveConstants';
import { ArchiveValidationError, UnsupportedArchiveVersionError } from './archiveErrors';
import type { ArchiveIssue } from './archiveTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function getArchiveSchemaVersion(input: unknown): number {
  if (!isRecord(input) || !isRecord(input.manifest)) {
    const issue: ArchiveIssue = {
      code: 'missing_manifest',
      message: 'The archive manifest is missing.',
      path: 'manifest',
      severity: 'error',
    };
    throw new ArchiveValidationError([issue]);
  }

  const version = input.manifest.schemaVersion;
  if (!Number.isInteger(version) || (version as number) < 1) {
    const issue: ArchiveIssue = {
      code: 'invalid_schema_version',
      message: 'The archive schema version is invalid.',
      path: 'manifest.schemaVersion',
      severity: 'error',
    };
    throw new ArchiveValidationError([issue]);
  }
  return version as number;
}

export function migrateArchivePayload(input: unknown): unknown {
  const schemaVersion = getArchiveSchemaVersion(input);
  if (schemaVersion > AURA_ARCHIVE_SCHEMA_VERSION) {
    throw new UnsupportedArchiveVersionError('schema', schemaVersion);
  }
  if (schemaVersion === 1) return input;
  throw new UnsupportedArchiveVersionError('schema', schemaVersion);
}
