import type { ArchiveIssue, PreparedRestore } from '../../domain/archive';
import { parseArchiveContainer } from './archiveBinary';
import { readPortableArchive, type ReadPortableArchiveOptions } from './archiveReader';

export interface ArchiveInspection {
  encrypted: boolean;
  payloadByteLength: number;
  fileByteLength: number;
}

export interface ArchiveRestorePreview {
  prepared: PreparedRestore;
  encrypted: boolean;
  createdAt: string;
  sourceAppVersion: string;
  sourceBuildSha: string;
  counts: PreparedRestore['manifest']['counts'];
  warnings: ArchiveIssue[];
}

export const archivePreflightService = {
  async inspect(file: Blob): Promise<ArchiveInspection> {
    const { header } = await parseArchiveContainer(file);
    return {
      encrypted: header.encryption.mode === 'passphrase',
      payloadByteLength: header.payloadByteLength,
      fileByteLength: file.size,
    };
  },

  async prepare(
    file: Blob,
    options: ReadPortableArchiveOptions = {},
  ): Promise<ArchiveRestorePreview> {
    const inspection = await this.inspect(file);
    const prepared = await readPortableArchive(file, options);
    return {
      prepared,
      encrypted: inspection.encrypted,
      createdAt: prepared.manifest.createdAt,
      sourceAppVersion: prepared.manifest.sourceAppVersion,
      sourceBuildSha: prepared.manifest.sourceBuildSha,
      counts: prepared.manifest.counts,
      warnings: prepared.warnings,
    };
  },
};
