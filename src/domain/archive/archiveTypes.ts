import type {
  CustomReminder,
  NotificationPreferences,
} from '../../types';
import type { AppData } from '../../data/model';
import {
  AURA_ARCHIVE_CRYPTO,
  AURA_ARCHIVE_FORMAT,
  AURA_ARCHIVE_FORMAT_VERSION,
  AURA_ARCHIVE_MEDIA_TYPE,
  AURA_ARCHIVE_SCHEMA_VERSION,
} from './archiveConstants';

export type ArchiveIssueSeverity = 'error' | 'warning';

export interface ArchiveIssue {
  code: string;
  message: string;
  path: string;
  severity: ArchiveIssueSeverity;
}

export interface ArchiveValidationResult<T> {
  value: T;
  warnings: ArchiveIssue[];
}

export interface AuraPortablePreferences {
  notificationPreferences: NotificationPreferences;
  customReminders: CustomReminder[];
  appearance: {
    darkMode: boolean;
  };
}

export interface AuraArchiveAttachment {
  transactionId: string;
  mediaType: string;
  byteLength: number;
  dataUrl: string;
}

export interface AuraArchiveCounts {
  transactions: number;
  budgets: number;
  recurring: number;
  accounts: number;
  categories: number;
  archivedCategories: number;
  savingsGoals: number;
  customReminders: number;
  attachments: number;
}

export interface AuraArchiveChecksums {
  dataSha256: string;
  preferencesSha256: string;
  attachments: Record<string, string>;
}

export interface AuraArchiveManifestV1 {
  archiveFormat: typeof AURA_ARCHIVE_FORMAT;
  formatVersion: typeof AURA_ARCHIVE_FORMAT_VERSION;
  schemaVersion: typeof AURA_ARCHIVE_SCHEMA_VERSION;
  createdAt: string;
  sourceAppVersion: string;
  sourceBuildSha: string;
  archiveId: string;
  counts: AuraArchiveCounts;
  checksums: AuraArchiveChecksums;
}

export interface AuraArchivePayloadV1 {
  manifest: AuraArchiveManifestV1;
  data: AppData;
  preferences: AuraPortablePreferences;
  attachments: AuraArchiveAttachment[];
}

export interface AuraArchiveHeaderBaseV1 {
  archiveFormat: typeof AURA_ARCHIVE_FORMAT;
  formatVersion: typeof AURA_ARCHIVE_FORMAT_VERSION;
  mediaType: typeof AURA_ARCHIVE_MEDIA_TYPE;
  payloadByteLength: number;
}

export interface AuraArchivePlaintextHeaderV1 extends AuraArchiveHeaderBaseV1 {
  encryption: {
    mode: 'none';
  };
  payloadSha256: string;
}

export interface AuraArchiveEncryptedHeaderV1 extends AuraArchiveHeaderBaseV1 {
  encryption: {
    mode: 'passphrase';
    algorithm: typeof AURA_ARCHIVE_CRYPTO.algorithm;
    keyLengthBits: typeof AURA_ARCHIVE_CRYPTO.keyLengthBits;
    authenticationTagBits: typeof AURA_ARCHIVE_CRYPTO.authenticationTagBits;
    kdf: typeof AURA_ARCHIVE_CRYPTO.kdf;
    kdfHash: typeof AURA_ARCHIVE_CRYPTO.kdfHash;
    kdfIterations: number;
    saltBase64: string;
    ivBase64: string;
  };
}

export type AuraArchiveHeaderV1 =
  | AuraArchivePlaintextHeaderV1
  | AuraArchiveEncryptedHeaderV1;

export type RestoreJournalStatus =
  | 'prepared'
  | 'rollback-staged'
  | 'attachments-staged'
  | 'data-committing'
  | 'data-committed'
  | 'attachments-committed'
  | 'verified'
  | 'rolling-back'
  | 'rolled-back'
  | 'completed'
  | 'failed';

export interface AuraRestoreJournalV1 {
  version: 1;
  restoreId: string;
  archiveId: string;
  status: RestoreJournalStatus;
  startedAt: string;
  updatedAt: string;
  hadExistingData: boolean;
  targetDataSha256: string;
  previousSnapshotKey?: string;
  targetSnapshotKey: string;
  lastErrorCode?: string;
}

export interface PreparedRestore {
  data: AppData;
  preferences: AuraPortablePreferences;
  attachments: Map<string, AuraArchiveAttachment>;
  manifest: AuraArchiveManifestV1;
  warnings: ArchiveIssue[];
}

export interface PortableSnapshot {
  data: AppData;
  preferences: AuraPortablePreferences;
  attachments: AuraArchiveAttachment[];
  warnings: ArchiveIssue[];
}
