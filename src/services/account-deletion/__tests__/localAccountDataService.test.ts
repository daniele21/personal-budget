import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../../data/storageKeys';
import { attachmentRepository } from '../../../repositories/attachmentRepository';
import { deleteManagedLocalAccountData } from '../localAccountDataService';

vi.mock('../../../repositories/attachmentRepository', () => ({
  attachmentRepository: { clearAllAttachments: vi.fn(async () => undefined) },
}));

describe('deleteManagedLocalAccountData', () => {
  const values = new Map<string, string>();

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        get length() { return values.size; },
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => [...values.keys()][index] ?? null,
        removeItem: (key: string) => { values.delete(key); },
        setItem: (key: string, value: string) => { values.set(key, String(value)); },
      } satisfies Storage,
    });
  });

  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('removes every registered Aura key and all managed IndexedDB attachments', async () => {
    Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.setItem(key, 'value'));
    window.localStorage.setItem('unrelated-origin-key', 'preserve');

    await deleteManagedLocalAccountData();

    Object.values(STORAGE_KEYS).forEach((key) => expect(window.localStorage.getItem(key)).toBeNull());
    expect(window.localStorage.getItem('unrelated-origin-key')).toBe('preserve');
    expect(attachmentRepository.clearAllAttachments).toHaveBeenCalledOnce();
  });
});
