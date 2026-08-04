import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { purgeNativePaymentData } from '../platform/nativeDataLifecycle';
import {
  AccountDeletionError,
  deleteAuraAccount,
  type AccountDeletionProgress,
} from '../services/account-deletion/accountDeletionService';
import { deleteManagedLocalAccountData } from '../services/account-deletion/localAccountDataService';

const STAGE_LABELS: Partial<Record<AccountDeletionProgress['stage'], string>> = {
  reauthenticating: 'Confirming your identity…',
  'deleting-remote': 'Deleting the encrypted cloud backup…',
  'deleting-native': 'Deleting Android payment-detection data…',
  'deleting-local': 'Deleting data stored on this device…',
  'deleting-auth': 'Deleting the Aura sign-in identity…',
};

export function AccountDeletionPage() {
  const {
    isLoggedIn,
    signInWithGoogle,
    deleteCloudBackup,
    reauthenticateForAccountDeletion,
    deleteAuthIdentity,
  } = useApp();
  const [confirmation, setConfirmation] = useState('');
  const [progress, setProgress] = useState<AccountDeletionProgress>({ stage: 'idle', retryable: false });
  const busy = !['idle', 'failed', 'complete'].includes(progress.stage);

  const handleDelete = async () => {
    if (confirmation !== 'DELETE' || busy) return;
    try {
      await deleteAuraAccount(
        {
          reauthenticate: reauthenticateForAccountDeletion,
          deleteRemoteData: deleteCloudBackup,
          deleteNativeData: () => purgeNativePaymentData('total_deletion'),
          deleteLocalData: deleteManagedLocalAccountData,
          deleteAuthIdentity,
        },
        { onProgress: setProgress },
      );
    } catch (error) {
      if (!(error instanceof AccountDeletionError)) {
        setProgress({ stage: 'failed', retryable: true, errorCode: 'auth-delete-failed' });
      }
    }
  };

  if (progress.stage === 'complete') {
    return (
      <main className="min-h-screen bg-surface px-5 py-12 text-on-surface">
        <div className="mx-auto max-w-xl rounded-3xl border border-secondary/20 bg-surface-container-lowest p-6 shadow-sm">
          <ShieldCheck className="h-10 w-10 text-secondary" aria-hidden="true" />
          <h1 className="mt-4 font-headline text-2xl font-extrabold text-primary">Aura account deleted</h1>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
            Your Firebase sign-in identity, encrypted cloud backup, managed local data and Android payment-detection data were deleted.
            Aura cannot delete any <code>.aura</code> files you previously exported.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface px-5 py-10 text-on-surface">
      <div className="mx-auto max-w-xl space-y-6">
        <Link to={isLoggedIn ? '/data' : '/'} className="inline-flex items-center gap-2 text-sm font-bold text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {isLoggedIn ? 'Back to Data & Privacy' : 'Back to sign in'}
        </Link>

        <section className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-tertiary/10 text-tertiary">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-micro font-bold uppercase text-tertiary">Permanent action</p>
              <h1 className="mt-1 font-headline text-2xl font-extrabold text-primary">Delete your Aura account</h1>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm leading-relaxed text-on-surface-variant">
            <p>This deletes the Aura-managed copies associated with your signed-in account:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>your Firebase Authentication identity;</li>
              <li>all encrypted Firestore backup versions;</li>
              <li>Aura financial data, preferences, reminders and receipts on this device;</li>
              <li>Android payment candidates, settings, tombstones and applicable keys.</li>
            </ul>
            <p>
              It does not delete <code>.aura</code> or CSV files you exported, copies stored by your device or cloud-file provider,
              or records Aura must route through support under a documented retention obligation.
            </p>
          </div>

          {!isLoggedIn ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-on-surface-variant">Sign in with the account you want to delete. Aura will ask Google to confirm your identity again before deletion.</p>
              <button type="button" onClick={() => void signInWithGoogle()} className="min-h-12 w-full rounded-2xl bg-primary px-4 text-sm font-extrabold text-on-primary">
                Sign in to continue
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-bold text-on-surface" htmlFor="delete-account-confirmation">
                Type DELETE to confirm
              </label>
              <input
                id="delete-account-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={busy}
                autoComplete="off"
                className="min-h-12 w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 text-sm focus:ring-2 focus:ring-primary"
              />
              {progress.stage === 'failed' && (
                <div role="alert" className="rounded-2xl bg-error-container p-4 text-sm text-on-error-container">
                  Deletion stopped safely before it could report success. Check your connection, sign in again if requested, and retry. If it still fails, contact support@staituned.com.
                </div>
              )}
              {busy && <p role="status" aria-live="polite" className="text-sm font-semibold text-on-surface-variant">{STAGE_LABELS[progress.stage]}</p>}
              <button
                type="button"
                disabled={confirmation !== 'DELETE' || busy}
                onClick={() => void handleDelete()}
                className="min-h-12 w-full rounded-2xl bg-tertiary px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Deleting account…' : progress.stage === 'failed' ? 'Retry account deletion' : 'Permanently delete account'}
              </button>
            </div>
          )}
        </section>

        <p className="text-center text-xs leading-relaxed text-on-surface-variant">
          Need help? Email <a className="font-bold text-primary" href="mailto:support@staituned.com">support@staituned.com</a>. Target response time: within one week.
        </p>
      </div>
    </main>
  );
}
