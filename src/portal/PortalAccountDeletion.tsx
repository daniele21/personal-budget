import { useState } from 'react';
import { useFirebaseAuth } from '@auth-runtime';
import { deleteBackup } from '../lib/backup';
import { deleteManagedLocalAccountData } from '../services/account-deletion/localAccountDataService';
import { AccountDeletionError, deleteAuraAccount, type AccountDeletionProgress } from '../services/account-deletion/accountDeletionService';

export function PortalAccountDeletion() {
  const { user, loading, signInWithGoogle, reauthenticateForAccountDeletion, deleteAuthIdentity } = useFirebaseAuth();
  const [confirmation, setConfirmation] = useState('');
  const [progress, setProgress] = useState<AccountDeletionProgress>({ stage: 'idle', retryable: false });
  const busy = !['idle', 'failed', 'complete'].includes(progress.stage);

  const removeAccount = async () => {
    if (!user || confirmation !== 'DELETE' || busy) return;
    try {
      await deleteAuraAccount({
        reauthenticate: reauthenticateForAccountDeletion,
        deleteRemoteData: () => deleteBackup(user.id),
        deleteNativeData: async () => undefined,
        deleteLocalData: deleteManagedLocalAccountData,
        deleteAuthIdentity,
      }, { onProgress: setProgress });
    } catch (error) {
      if (!(error instanceof AccountDeletionError)) {
        setProgress({ stage: 'failed', retryable: true, errorCode: 'auth-delete-failed' });
      }
    }
  };

  if (loading) return <main className="mx-auto max-w-xl px-5 py-12" role="status">Loading account deletion…</main>;
  if (progress.stage === 'complete') {
    return <main className="mx-auto max-w-xl px-5 py-12"><h1 className="font-headline text-3xl font-extrabold">Aura account deleted</h1><p className="mt-3 text-on-surface-variant">The authentication identity and all managed encrypted backup versions were deleted. Exported files remain under your control.</p></main>;
  }

  return (
    <main className="mx-auto max-w-xl space-y-5 px-5 py-12">
      <h1 className="font-headline text-3xl font-extrabold">Delete your Aura account</h1>
      <p className="leading-relaxed text-on-surface-variant">This permanently deletes your Firebase sign-in identity and every Aura-managed encrypted cloud-backup version. It cannot delete files you exported.</p>
      {!user ? (
        <button type="button" onClick={() => void signInWithGoogle()} className="min-h-12 w-full rounded-xl bg-primary px-4 font-bold text-on-primary">Sign in to continue</button>
      ) : (
        <div className="space-y-4">
          <label htmlFor="portal-delete-confirmation" className="block text-sm font-bold">Type DELETE to confirm</label>
          <input id="portal-delete-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} className="min-h-12 w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-4" />
          {progress.stage === 'failed' && <p role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">Deletion stopped safely. Check the connection and retry, or contact support.</p>}
          {busy && <p role="status" aria-live="polite">Deleting managed Aura data…</p>}
          <button type="button" disabled={confirmation !== 'DELETE' || busy} onClick={() => void removeAccount()} className="min-h-12 w-full rounded-xl bg-tertiary px-4 font-bold text-white disabled:opacity-50">{progress.stage === 'failed' ? 'Retry account deletion' : 'Permanently delete account'}</button>
        </div>
      )}
    </main>
  );
}

