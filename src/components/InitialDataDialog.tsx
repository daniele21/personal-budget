import React, { useEffect, useRef } from 'react';
import { Check, Cloud, Database, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Button } from './ui/Button';
import type { BackupVersion } from '../lib/backup';
import { formatBackupDate } from '../utils/backupDates';

interface InitialDataDialogProps {
  isOpen: boolean;
  backupAvailable: boolean;
  backupVersions: BackupVersion[];
  onRestoreBackup: (versionId: string) => Promise<boolean>;
  onStartBlank: () => void;
  onUseDemoData: () => void;
}

export function InitialDataDialog({
  isOpen,
  backupAvailable,
  backupVersions,
  onRestoreBackup,
  onStartBlank,
  onUseDemoData,
}: InitialDataDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selectedVersionId, setSelectedVersionId] = React.useState('');
  const [isRestoring, setIsRestoring] = React.useState(false);
  const [restoreError, setRestoreError] = React.useState(false);
  useFocusTrap(dialogRef, isOpen, isRestoring ? undefined : onStartBlank);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedVersionId(backupVersions[0]?.id ?? '');
    setRestoreError(false);
  }, [backupVersions, isOpen]);

  const handleRestore = async () => {
    if (!selectedVersionId || isRestoring) return;
    setIsRestoring(true);
    setRestoreError(false);
    const restored = await onRestoreBackup(selectedVersionId);
    setIsRestoring(false);
    if (!restored) setRestoreError(true);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[155] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="initial-data-title"
      aria-describedby="initial-data-description"
    >
      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md rounded-t-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-5">
          <p className="text-micro font-bold text-primary">First launch</p>
          <h3 id="initial-data-title" className="font-headline text-xl font-extrabold text-on-surface">
            How would you like to start?
          </h3>
          <p id="initial-data-description" className="mt-1 text-xs leading-relaxed text-on-surface-variant">
            There is no local data yet. You can use demo data, start from scratch
            {backupAvailable ? ', or restore the encrypted backup found in the cloud.' : '.'}
          </p>
        </div>

        <div className="space-y-3">
          {backupAvailable && (
            <div className="space-y-3">
              <div
                className="overflow-hidden rounded-2xl border border-outline-variant/20"
                role="radiogroup"
                aria-label="Backup version to restore"
              >
                {backupVersions.map((version, index) => {
                  const selected = version.id === selectedVersionId;
                  return (
                    <button
                      key={version.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={isRestoring}
                      onClick={() => setSelectedVersionId(version.id)}
                      className={`flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors disabled:pointer-events-none disabled:opacity-60 ${
                        index > 0 ? 'border-t border-outline-variant/15' : ''
                      } ${selected ? 'bg-primary/10 text-primary' : 'bg-surface-container-lowest text-on-surface'}`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        selected ? 'bg-primary text-on-primary' : 'bg-surface-container-high'
                      }`}>
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

              {restoreError && (
                <p role="alert" className="text-xs font-medium text-error">
                  Unable to restore the selected version. Try again when you are online.
                </p>
              )}

              <button
                type="button"
                onClick={handleRestore}
                disabled={!selectedVersionId || isRestoring}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-on-primary shadow-md shadow-primary/15 transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
              >
                <Cloud className="h-5 w-5" />
                <span className="font-headline text-sm font-extrabold">
                  {isRestoring ? 'Restoring...' : 'Restore selected backup'}
                </span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onUseDemoData}
            disabled={isRestoring}
            className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-secondary-container px-4 py-3 text-left text-on-secondary-container transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15">
              <Sparkles className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-headline text-sm font-extrabold">Use demo data</span>
              <span className="block text-xs opacity-80">Populate the dashboard, budgets, reports, and recurring items with local examples.</span>
            </span>
          </button>

          <Button type="button" variant="secondary" fullWidth disabled={isRestoring} onClick={onStartBlank}>
            <Database className="h-4 w-4" />
            Start from scratch
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
