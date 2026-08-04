export type AccountDeletionStage =
  | 'idle'
  | 'reauthenticating'
  | 'deleting-remote'
  | 'deleting-native'
  | 'deleting-local'
  | 'deleting-auth'
  | 'complete'
  | 'failed';

export interface AccountDeletionProgress {
  stage: AccountDeletionStage;
  retryable: boolean;
  errorCode?: 'reauth-required' | 'remote-delete-failed' | 'native-delete-failed' | 'local-delete-failed' | 'auth-delete-failed';
}

export interface AccountDeletionDependencies {
  reauthenticate: () => Promise<void>;
  deleteRemoteData: () => Promise<boolean>;
  deleteNativeData: () => Promise<void>;
  deleteLocalData: () => Promise<void>;
  deleteAuthIdentity: () => Promise<void>;
}

export interface AccountDeletionOptions {
  onProgress?: (progress: AccountDeletionProgress) => void;
}

export class AccountDeletionError extends Error {
  constructor(
    public readonly code: NonNullable<AccountDeletionProgress['errorCode']>,
    public readonly stage: AccountDeletionStage,
    public readonly cause?: unknown,
  ) {
    super(code);
    this.name = 'AccountDeletionError';
  }
}

async function runStage(
  stage: Exclude<AccountDeletionStage, 'idle' | 'complete' | 'failed'>,
  code: NonNullable<AccountDeletionProgress['errorCode']>,
  operation: () => Promise<void>,
  onProgress?: AccountDeletionOptions['onProgress'],
): Promise<void> {
  onProgress?.({ stage, retryable: false });
  try {
    await operation();
  } catch (error) {
    onProgress?.({ stage: 'failed', retryable: true, errorCode: code });
    throw new AccountDeletionError(code, stage, error);
  }
}

/**
 * Deletes Aura-managed data in dependency order. Reauthentication happens
 * first, while the authenticated session is still intact. Remote data is
 * deleted before the local and Firebase identities so an interrupted attempt
 * can be retried without requiring privileged backend cleanup.
 */
export async function deleteAuraAccount(
  dependencies: AccountDeletionDependencies,
  options: AccountDeletionOptions = {},
): Promise<void> {
  await runStage('reauthenticating', 'reauth-required', dependencies.reauthenticate, options.onProgress);
  await runStage('deleting-remote', 'remote-delete-failed', async () => {
    if (!(await dependencies.deleteRemoteData())) {
      throw new Error('Remote deletion was not confirmed.');
    }
  }, options.onProgress);
  await runStage('deleting-native', 'native-delete-failed', dependencies.deleteNativeData, options.onProgress);
  await runStage('deleting-local', 'local-delete-failed', dependencies.deleteLocalData, options.onProgress);
  await runStage('deleting-auth', 'auth-delete-failed', dependencies.deleteAuthIdentity, options.onProgress);
  options.onProgress?.({ stage: 'complete', retryable: false });
}
