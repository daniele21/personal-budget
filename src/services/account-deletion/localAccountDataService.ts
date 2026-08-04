import { STORAGE_KEYS } from '../../data/storageKeys';
import { attachmentRepository } from '../../repositories/attachmentRepository';

/** Deletes only Aura-owned browser data and leaves unrelated origin data alone. */
export async function deleteManagedLocalAccountData(): Promise<void> {
  for (const key of Object.values(STORAGE_KEYS)) {
    window.localStorage.removeItem(key);
  }
  await attachmentRepository.clearAllAttachments();
}
