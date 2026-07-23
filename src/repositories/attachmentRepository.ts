import { del, get, keys, set } from 'idb-keyval';
import type { Transaction } from '../types';
import {
  AURA_RESTORE_STAGING_PREFIX,
  AURA_ARCHIVE_LIMITS,
  parseAttachmentDataUrl,
  type ArchiveIssue,
  type AuraArchiveAttachment,
} from '../domain/archive';

const ATTACHMENT_PREFIX = 'attachment_';
const RESTORE_ATTACHMENT_SEGMENT = '/attachments/';

export interface AttachmentInventory {
  attachments: AuraArchiveAttachment[];
  warnings: ArchiveIssue[];
  orphanedTransactionIds: string[];
}

function finalAttachmentKey(transactionId: string): string {
  return `${ATTACHMENT_PREFIX}${transactionId}`;
}

function stagingPrefix(restoreId: string): string {
  return `${AURA_RESTORE_STAGING_PREFIX}${encodeURIComponent(restoreId)}${RESTORE_ATTACHMENT_SEGMENT}`;
}

function stagedAttachmentKey(restoreId: string, transactionId: string): string {
  return `${stagingPrefix(restoreId)}${encodeURIComponent(transactionId)}`;
}

function assertIdentifier(value: string, label: string): void {
  if (!value.trim() || value.length > 256) {
    throw new Error(`Invalid ${label}.`);
  }
}

function stringKeys(values: IDBValidKey[]): string[] {
  return values.filter((key): key is string => typeof key === 'string');
}

async function deleteKeys(storageKeys: string[]): Promise<void> {
  await Promise.all(storageKeys.map((key) => del(key)));
}

export const attachmentRepository = {
  async getAttachment(transactionId: string): Promise<string | undefined> {
    try {
      const value = await get(finalAttachmentKey(transactionId));
      return typeof value === 'string' ? value : undefined;
    } catch (error) {
      console.error('[AttachmentRepository] Error getting attachment:', error);
      return undefined;
    }
  },

  async saveAttachment(transactionId: string, attachmentUrl: string): Promise<void> {
    try {
      assertIdentifier(transactionId, 'transaction ID');
      const parsed = parseAttachmentDataUrl(attachmentUrl);
      if (!parsed || parsed.byteLength > AURA_ARCHIVE_LIMITS.maxAttachmentBytes) {
        throw new Error('Invalid attachment payload.');
      }
      await set(finalAttachmentKey(transactionId), attachmentUrl);
    } catch (error) {
      console.error('[AttachmentRepository] Error saving attachment:', error);
      throw error;
    }
  },

  async deleteAttachment(transactionId: string): Promise<void> {
    try {
      assertIdentifier(transactionId, 'transaction ID');
      await del(finalAttachmentKey(transactionId));
    } catch (error) {
      console.error('[AttachmentRepository] Error deleting attachment:', error);
      throw error;
    }
  },

  async listAttachments(transactions: Transaction[]): Promise<AttachmentInventory> {
    const allKeys = stringKeys(await keys());
    const finalKeys = allKeys.filter((key) => key.startsWith(ATTACHMENT_PREFIX));
    const storedIds = new Set(finalKeys.map((key) => key.slice(ATTACHMENT_PREFIX.length)));
    const referencedIds = new Set(
      transactions
        .filter((transaction) => Boolean(transaction.attachmentUrl))
        .map((transaction) => transaction.id),
    );
    const attachments: AuraArchiveAttachment[] = [];
    const warnings: ArchiveIssue[] = [];

    for (const transaction of transactions) {
      if (!transaction.attachmentUrl) continue;
      const value = await get(finalAttachmentKey(transaction.id));
      if (typeof value !== 'string') {
        warnings.push({
          code: 'missing_attachment',
          message: `Transaction "${transaction.id}" references an unavailable attachment.`,
          path: `attachments.${transaction.id}`,
          severity: 'warning',
        });
        continue;
      }
      const parsed = parseAttachmentDataUrl(value);
      if (!parsed) {
        warnings.push({
          code: 'invalid_attachment_data',
          message: `Transaction "${transaction.id}" has an unreadable attachment.`,
          path: `attachments.${transaction.id}`,
          severity: 'warning',
        });
        continue;
      }
      if (parsed.byteLength > AURA_ARCHIVE_LIMITS.maxAttachmentBytes) {
        warnings.push({
          code: 'attachment_too_large',
          message: `Transaction "${transaction.id}" has an attachment above the V1 size limit.`,
          path: `attachments.${transaction.id}`,
          severity: 'warning',
        });
      }
      attachments.push({
        transactionId: transaction.id,
        mediaType: parsed.mediaType,
        byteLength: parsed.byteLength,
        dataUrl: value,
      });
    }

    return {
      attachments,
      warnings,
      orphanedTransactionIds: [...storedIds]
        .filter((transactionId) => !referencedIds.has(transactionId))
        .sort(),
    };
  },

  async stageAttachments(restoreId: string, attachments: AuraArchiveAttachment[]): Promise<void> {
    assertIdentifier(restoreId, 'restore ID');
    const writtenKeys: string[] = [];
    const seenTransactionIds = new Set<string>();
    try {
      for (const attachment of attachments) {
        assertIdentifier(attachment.transactionId, 'transaction ID');
        if (seenTransactionIds.has(attachment.transactionId)) {
          throw new Error('Duplicate attachment staging payload.');
        }
        seenTransactionIds.add(attachment.transactionId);
        const parsed = parseAttachmentDataUrl(attachment.dataUrl);
        if (
          !parsed ||
          parsed.byteLength > AURA_ARCHIVE_LIMITS.maxAttachmentBytes ||
          parsed.mediaType !== attachment.mediaType ||
          parsed.byteLength !== attachment.byteLength
        ) {
          throw new Error('Invalid attachment staging payload.');
        }
        const key = stagedAttachmentKey(restoreId, attachment.transactionId);
        await set(key, attachment.dataUrl);
        writtenKeys.push(key);
      }
    } catch (error) {
      await deleteKeys(writtenKeys);
      throw error;
    }
  },

  async listStagedTransactionIds(restoreId: string): Promise<string[]> {
    assertIdentifier(restoreId, 'restore ID');
    const prefix = stagingPrefix(restoreId);
    return stringKeys(await keys())
      .filter((key) => key.startsWith(prefix))
      .map((key) => decodeURIComponent(key.slice(prefix.length)))
      .sort();
  },

  async commitStagedAttachments(restoreId: string): Promise<string[]> {
    const transactionIds = await this.listStagedTransactionIds(restoreId);
    for (const transactionId of transactionIds) {
      const value = await get(stagedAttachmentKey(restoreId, transactionId));
      if (typeof value !== 'string') {
        throw new Error('A staged attachment is unavailable.');
      }
      await set(finalAttachmentKey(transactionId), value);
    }
    await this.rollbackStagedAttachments(restoreId);
    return transactionIds;
  },

  async rollbackStagedAttachments(restoreId: string): Promise<void> {
    assertIdentifier(restoreId, 'restore ID');
    const prefix = stagingPrefix(restoreId);
    const stagedKeys = stringKeys(await keys()).filter((key) => key.startsWith(prefix));
    await deleteKeys(stagedKeys);
  },

  async cleanupOrphanAttachments(validTransactionIds: Iterable<string>): Promise<string[]> {
    const validIds = new Set(validTransactionIds);
    const finalKeys = stringKeys(await keys()).filter((key) => key.startsWith(ATTACHMENT_PREFIX));
    const removedIds: string[] = [];
    for (const key of finalKeys) {
      const transactionId = key.slice(ATTACHMENT_PREFIX.length);
      if (!validIds.has(transactionId)) {
        await del(key);
        removedIds.push(transactionId);
      }
    }
    return removedIds.sort();
  },

  async clearAllAttachments(): Promise<void> {
    try {
      const auraKeys = stringKeys(await keys()).filter((key) => (
        key.startsWith(ATTACHMENT_PREFIX) || key.startsWith(AURA_RESTORE_STAGING_PREFIX)
      ));
      await deleteKeys(auraKeys);
    } catch (error) {
      console.error('[AttachmentRepository] Error clearing attachments:', error);
      throw error;
    }
  },
};
