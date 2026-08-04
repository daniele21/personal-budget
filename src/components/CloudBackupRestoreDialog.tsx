import React, { useEffect, useState } from 'react';
import { Check, Cloud, LoaderCircle, RotateCcw } from 'lucide-react';
import type { BackupVersion } from '../lib/backup';
import { cn } from '../lib/utils';
import { formatBackupDate } from '../utils/backupDates';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';

interface CloudBackupRestoreDialogProps {
  isOpen: boolean;
  versions: BackupVersion[];
  isLoading: boolean;
  onClose: () => void;
  onRestore: (versionId: string) => Promise<boolean>;
}

export function CloudBackupRestoreDialog({
  isOpen,
  versions,
  isLoading,
  onClose,
  onRestore,
}: CloudBackupRestoreDialogProps) {
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedVersionId(versions[0]?.id ?? '');
    setIsConfirming(false);
    setIsRestoring(false);
    setRestoreError(false);
  }, [isOpen, versions]);

  const selectedVersion = versions.find((version) => version.id === selectedVersionId);

  const handleRestore = async () => {
    if (!selectedVersion || isRestoring) return;
    setIsRestoring(true);
    setRestoreError(false);
    const restored = await onRestore(selectedVersion.id);
    setIsRestoring(false);
    if (restored) {
      onClose();
      return;
    }
    setRestoreError(true);
    setIsConfirming(false);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      eyebrow="Cloud backup"
      title={isConfirming ? 'Confirm restore' : 'Choose a backup'}
      subtitle={
        isConfirming
          ? 'Restoring replaces the financial data currently stored on this device.'
          : 'The latest five valid versions saved to Firestore are available.'
      }
      onClose={isRestoring ? () => {} : onClose}
      footer={
        isConfirming ? (
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={isRestoring}
              onClick={() => setIsConfirming(false)}
            >
              Back
            </Button>
            <Button
              type="button"
              fullWidth
              disabled={isRestoring}
              onClick={handleRestore}
            >
              {isRestoring ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {isRestoring ? 'Restoring...' : 'Confirm restore'}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            fullWidth
            disabled={!selectedVersion || isLoading}
            onClick={() => setIsConfirming(true)}
          >
            <RotateCcw className="h-4 w-4" />
            Restore selected version
          </Button>
        )
      }
    >
      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-on-surface-variant">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading backups...
        </div>
      ) : versions.length === 0 ? (
        <div className="rounded-2xl bg-surface-container-low p-5 text-center">
          <Cloud className="mx-auto h-6 w-6 text-on-surface-variant" />
          <p className="mt-3 text-sm font-bold text-on-surface">No backups available</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Create a backup while online, then try again.
          </p>
        </div>
      ) : isConfirming && selectedVersion ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-primary/10 p-4">
            <p className="text-micro font-bold uppercase text-primary">Selected version</p>
            <p className="mt-1 text-sm font-bold text-on-surface">
              {formatBackupDate(selectedVersion.createdAt)}
            </p>
          </div>
          <p className="text-xs leading-relaxed text-on-surface-variant">
            Local transactions, budgets, recurring items, accounts, categories, and goals will
            be replaced. Export an Aura archive first if you need to keep the current state.
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-2xl border border-outline-variant/20"
          role="radiogroup"
          aria-label="Backup version to restore"
        >
          {versions.map((version, index) => {
            const selected = version.id === selectedVersionId;
            return (
              <button
                key={version.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setSelectedVersionId(version.id);
                  setRestoreError(false);
                }}
                className={cn(
                  'flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30',
                  index > 0 && 'border-t border-outline-variant/15',
                  selected
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    selected
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant',
                  )}
                >
                  {selected ? <Check className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">
                    {version.isLatest ? 'Latest backup' : `Previous backup ${version.position}`}
                  </span>
                  <span className="block text-xs text-on-surface-variant">
                    {formatBackupDate(version.createdAt)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {restoreError && (
        <p role="alert" className="mt-3 text-xs font-medium text-error">
          Unable to restore the selected version. Refresh the list and try again.
        </p>
      )}
    </BottomSheet>
  );
}
