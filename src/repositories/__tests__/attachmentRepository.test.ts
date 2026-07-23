import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Transaction } from '../../types';
import { set as idbSet } from 'idb-keyval';

const storage = vi.hoisted(() => new Map<IDBValidKey, unknown>());

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: IDBValidKey) => storage.get(key)),
  set: vi.fn(async (key: IDBValidKey, value: unknown) => { storage.set(key, value); }),
  del: vi.fn(async (key: IDBValidKey) => { storage.delete(key); }),
  keys: vi.fn(async () => [...storage.keys()]),
}));

import { attachmentRepository } from '../attachmentRepository';

const transaction = (id: string, attached = true): Transaction => ({
  id,
  amount: 10,
  type: 'expense',
  category: 'Food',
  date: '2026-07-20T00:00:00.000Z',
  title: 'Test',
  description: '',
  paymentMethod: 'Cash',
  attachmentUrl: attached ? 'indexeddb' : undefined,
});

describe('attachmentRepository portable archive operations', () => {
  beforeEach(() => storage.clear());

  it('enumerates referenced attachments and reports missing and orphaned records', async () => {
    storage.set('attachment_present', 'data:image/png;base64,AQID');
    storage.set('attachment_orphan', 'data:image/png;base64,AQID');
    storage.set('unrelated_key', 'keep');

    const inventory = await attachmentRepository.listAttachments([
      transaction('present'),
      transaction('missing'),
    ]);

    expect(inventory.attachments).toEqual([
      expect.objectContaining({ transactionId: 'present', byteLength: 3, mediaType: 'image/png' }),
    ]);
    expect(inventory.warnings).toEqual([
      expect.objectContaining({ code: 'missing_attachment' }),
    ]);
    expect(inventory.orphanedTransactionIds).toEqual(['orphan']);
  });

  it('stages, commits, and removes restore-scoped attachments', async () => {
    await attachmentRepository.stageAttachments('restore-1', [{
      transactionId: 'tx-1',
      mediaType: 'image/png',
      byteLength: 3,
      dataUrl: 'data:image/png;base64,AQID',
    }]);

    expect(await attachmentRepository.listStagedTransactionIds('restore-1')).toEqual(['tx-1']);
    expect(await attachmentRepository.commitStagedAttachments('restore-1')).toEqual(['tx-1']);
    expect(storage.get('attachment_tx-1')).toBe('data:image/png;base64,AQID');
    expect(await attachmentRepository.listStagedTransactionIds('restore-1')).toEqual([]);
  });

  it('cleans already written staging keys when a later write fails', async () => {
    vi.mocked(idbSet)
      .mockImplementationOnce(async (key: IDBValidKey, value: unknown) => { storage.set(key, value); })
      .mockRejectedValueOnce(new Error('quota exceeded'));

    await expect(attachmentRepository.stageAttachments('restore-failure', [
      {
        transactionId: 'tx-1',
        mediaType: 'image/png',
        byteLength: 3,
        dataUrl: 'data:image/png;base64,AQID',
      },
      {
        transactionId: 'tx-2',
        mediaType: 'image/png',
        byteLength: 3,
        dataUrl: 'data:image/png;base64,AQID',
      },
    ])).rejects.toThrow('quota exceeded');

    expect(await attachmentRepository.listStagedTransactionIds('restore-failure')).toEqual([]);
  });

  it('rolls staging back and preserves unrelated IndexedDB entries during clear', async () => {
    storage.set('attachment_old', 'data:image/png;base64,AQID');
    storage.set('aura_restore/restore-1/attachments/tx-1', 'data:image/png;base64,AQID');
    storage.set('unrelated_key', 'keep');

    await attachmentRepository.rollbackStagedAttachments('restore-1');
    expect(storage.has('aura_restore/restore-1/attachments/tx-1')).toBe(false);

    await attachmentRepository.clearAllAttachments();
    expect(storage.has('attachment_old')).toBe(false);
    expect(storage.get('unrelated_key')).toBe('keep');
  });

  it('cleans only final attachments that do not belong to valid transactions', async () => {
    storage.set('attachment_keep', 'data:image/png;base64,AQID');
    storage.set('attachment_remove', 'data:image/png;base64,AQID');

    await expect(attachmentRepository.cleanupOrphanAttachments(['keep'])).resolves.toEqual(['remove']);
    expect(storage.has('attachment_keep')).toBe(true);
    expect(storage.has('attachment_remove')).toBe(false);
  });
});
