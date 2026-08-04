import { describe, expect, it, vi } from 'vitest';
import {
  deleteAuraAccount,
  type AccountDeletionDependencies,
  type AccountDeletionStage,
} from '../accountDeletionService';

function dependencies(order: string[]): AccountDeletionDependencies {
  return {
    reauthenticate: vi.fn(async () => { order.push('reauth'); }),
    deleteRemoteData: vi.fn(async () => { order.push('remote'); return true; }),
    deleteNativeData: vi.fn(async () => { order.push('native'); }),
    deleteLocalData: vi.fn(async () => { order.push('local'); }),
    deleteAuthIdentity: vi.fn(async () => { order.push('auth'); }),
  };
}

describe('deleteAuraAccount', () => {
  it('deletes each managed surface in safe order and reports completion', async () => {
    const order: string[] = [];
    const stages: AccountDeletionStage[] = [];

    await deleteAuraAccount(dependencies(order), {
      onProgress: ({ stage }) => stages.push(stage),
    });

    expect(order).toEqual(['reauth', 'remote', 'native', 'local', 'auth']);
    expect(stages).toEqual([
      'reauthenticating',
      'deleting-remote',
      'deleting-native',
      'deleting-local',
      'deleting-auth',
      'complete',
    ]);
  });

  it('fails closed and does not continue when remote deletion is unconfirmed', async () => {
    const order: string[] = [];
    const deps = dependencies(order);
    deps.deleteRemoteData = vi.fn(async () => { order.push('remote'); return false; });

    await expect(deleteAuraAccount(deps)).rejects.toMatchObject({
      code: 'remote-delete-failed',
      stage: 'deleting-remote',
    });
    expect(order).toEqual(['reauth', 'remote']);
  });

  it('stops before destructive work when recent authentication fails', async () => {
    const order: string[] = [];
    const deps = dependencies(order);
    deps.reauthenticate = vi.fn(async () => { throw new Error('cancelled'); });

    await expect(deleteAuraAccount(deps)).rejects.toMatchObject({
      code: 'reauth-required',
    });
    expect(deps.deleteRemoteData).not.toHaveBeenCalled();
  });
});
