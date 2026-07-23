import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Download,
  Upload,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Cloud,
  FileArchive,
  LockKeyhole,
  History,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PreparedRestore } from '../domain/archive';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import { pageTransition } from '../utils/motion';
import { ExportArchiveDialog } from '../components/archive/ExportArchiveDialog';
import { ImportArchiveDialog } from '../components/archive/ImportArchiveDialog';
import { RestoreArchiveConfirmDialog } from '../components/archive/RestoreArchiveConfirmDialog';
import { downloadBlob } from '../services/archive/archiveDownload';
import { CloudBackupRestoreDialog } from '../components/CloudBackupRestoreDialog';

export function DataPrivacyPage() {
  const { toast } = useToast();
  const {
    accounts,
    transactions,
    budgets,
    recurring,
    categories,
    archivedCategories,
    savingsGoals,
    monthlyBudget,
    cloudBackupEnabled,
    setCloudBackupEnabled,
    backupStatus,
    lastBackupDate,
    backupVersions,
    backupVersionsLoading,
    refreshBackupVersions,
    restoreFromCloud,
    deleteCloudBackup,
    pushBackupNow,
    resetAll,
  } = useApp();

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showResetLocalDialog, setShowResetLocalDialog] = useState(false);
  const [showResetAllDialog, setShowResetAllDialog] = useState(false);
  const [showExportArchiveDialog, setShowExportArchiveDialog] = useState(false);
  const [showImportArchiveDialog, setShowImportArchiveDialog] = useState(false);
  const [showCloudRestoreDialog, setShowCloudRestoreDialog] = useState(false);
  const [restoreCandidate, setRestoreCandidate] = useState<{
    prepared: PreparedRestore;
    passphrase?: string;
  } | null>(null);

  const portableAppData = useMemo(
    () => ({
      transactions,
      budgets,
      recurring,
      accounts,
      categories,
      archivedCategories,
      savingsGoals,
      monthlyBudget,
    }),
    [
      accounts,
      archivedCategories,
      budgets,
      categories,
      monthlyBudget,
      recurring,
      savingsGoals,
      transactions,
    ],
  );

  const handleResetLocal = () => {
    resetAll();
  };

  const handleResetAll = async () => {
    await deleteCloudBackup();
    resetAll();
  };

  const handleBackupNow = async () => {
    if (isBackingUp) return;
    if (!cloudBackupEnabled) {
      toast('Enable cloud backup first', 'warning');
      return;
    }
    setIsBackingUp(true);
    toast('Starting backup...', 'info');
    const ok = await pushBackupNow();
    setIsBackingUp(false);
    if (ok) toast('Backup pushed to cloud successfully', 'success');
    else toast('Backup failed or skipped (no local data / offline)', 'error');
  };

  const handleOpenCloudRestore = () => {
    setShowCloudRestoreDialog(true);
    void refreshBackupVersions();
  };

  const handleCloudRestore = async (versionId: string): Promise<boolean> => {
    const restored = await restoreFromCloud(versionId);
    if (restored) {
      toast('Backup ripristinato sul dispositivo', 'success');
    } else {
      toast('Impossibile ripristinare il backup selezionato', 'error');
    }
    return restored;
  };

  const handleExportTransactionsCsv = async () => {
    const { default: Papa } = await import('papaparse');
    const transactionsCsv = Papa.unparse(
      transactions.map((transaction) => ({
        id: transaction.id,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        date: transaction.date,
        title: transaction.title,
        description: transaction.description,
        paymentMethod: transaction.paymentMethod,
        attachmentUrl: transaction.attachmentUrl,
        verified: transaction.verified,
        sourceRecurringId: transaction.sourceRecurringId,
        sourceMonthKey: transaction.sourceMonthKey,
        recurringEdited: transaction.recurringEdited,
        reportingClass: transaction.reportingClass ?? 'regular',
        reportingNote: transaction.reportingNote ?? '',
      })),
    );
    const transactionsBlob = new Blob([transactionsCsv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(
      transactionsBlob,
      `aura_transactions_${new Date().toISOString().split('T')[0]}.csv`,
    );
  };

  return (
    <motion.div
      {...pageTransition}
      data-testid="data-privacy-page"
      className="space-y-6 pb-24"
    >
      <section className="space-y-1 px-1">
        <p className="text-micro font-bold uppercase text-on-surface-variant">Storage & Security</p>
        <h2 className="font-headline text-2xl font-extrabold text-primary">Data & Privacy</h2>
      </section>

      {/* Complete Aura Archive Section */}
      <section id="archive" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-headline font-bold text-primary">Portable Archive</h3>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-outline-variant/5 space-y-4">
          <div className="flex items-start gap-3 border-b border-outline-variant/15 pb-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileArchive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">Complete Aura archive</p>
              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                Use one verified file to rebuild your local workspace, including receipts and supported preferences. Processing stays on this device.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowExportArchiveDialog(true)}
            className="group flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl bg-primary p-4 text-on-primary shadow-md shadow-primary/15 transition-all hover:bg-primary-container active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <span className="flex min-w-0 items-center gap-3 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <LockKeyhole className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-headline font-extrabold">Export complete archive</span>
                <span className="block text-micro font-medium text-on-primary/75">
                  Passphrase protection selected by default
                </span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-on-primary/70 transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowImportArchiveDialog(true)}
            className="group flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 text-on-surface transition-all hover:bg-surface-container-low active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <span className="flex min-w-0 items-center gap-3 text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Upload className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-bold">Import Aura archive</span>
                <span className="block text-micro text-on-surface-variant">
                  Verify, preview, create safety protection, then replace
                </span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant/50 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>

      {/* CSV Export & Import Bank Statements */}
      <section id="interoperability" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-headline font-bold text-primary">Interoperability</h3>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-outline-variant/5 space-y-4">
          <p className="text-micro leading-relaxed text-on-surface-variant">
            CSV is for analysis or moving transaction rows. It is not a complete backup and does not include receipts, accounts, recurring rules, goals, or preferences.
          </p>

          <button
            onClick={handleExportTransactionsCsv}
            className="w-full flex items-center justify-between gap-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 hover:bg-surface-container-high active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3 min-w-0 text-left">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">Export transactions CSV</p>
                <p className="text-micro text-on-surface-variant font-medium">Download spreadsheet-ready CSV</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </button>

          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/5 p-5 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">Importa transazioni</p>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Carica estratti conto Excel o CSV. I file generici vengono inviati a Google Gemini dopo il consenso; gli export CSV Aura restano locali.
              </p>
            </div>
            <Link
              to="/transactions?import=1"
              className="w-full py-3 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-md shadow-primary/15 active:scale-[0.98] transition-all"
            >
              Import bank statement or CSV
            </Link>
          </div>
        </div>
      </section>

      {/* Cloud Backup */}
      <section id="cloud-backup" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-headline font-bold text-primary">Cloud Sync & Backup</h3>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleBackupNow}
            disabled={isBackingUp || !cloudBackupEnabled}
            className="group w-full min-h-16 flex items-center justify-between gap-3 p-4 bg-primary text-on-primary rounded-2xl shadow-md shadow-primary/15 hover:bg-primary-container active:scale-[0.99] transition-all disabled:pointer-events-none disabled:opacity-70"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                <RefreshCw className={cn('w-5 h-5', isBackingUp && 'animate-spin')} />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-headline font-extrabold leading-tight">
                  {isBackingUp ? 'Backing up...' : 'Backup now'}
                </p>
                <p className="text-micro text-on-primary/75 font-medium leading-tight">
                  {cloudBackupEnabled
                    ? `Encrypted cloud backup: ${backupStatus}`
                    : 'Enable cloud backup first'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-on-primary/70 transition-transform group-hover:translate-x-0.5" />
          </button>

          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Cloud className="w-5 h-5 text-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-on-surface">Cloud backup</p>
                  <p className="text-micro text-on-surface-variant font-medium">
                    {cloudBackupEnabled ? 'Attivo' : 'Off'}
                    {lastBackupDate ? ` · ${lastBackupDate}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCloudBackupEnabled(!cloudBackupEnabled)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                  cloudBackupEnabled ? 'bg-primary' : 'bg-surface-container-highest',
                )}
                role="switch"
                aria-checked={cloudBackupEnabled}
                aria-label={cloudBackupEnabled ? 'Disattiva backup cloud' : 'Attiva backup cloud'}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    cloudBackupEnabled ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenCloudRestore}
            className="group flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 text-on-surface transition-all hover:bg-surface-container-low active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <span className="flex min-w-0 items-center gap-3 text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <History className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-bold">Ripristina backup cloud</span>
                <span className="block text-micro text-on-surface-variant">
                  Scegli tra le ultime 3 versioni salvate
                </span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant/50 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>

      {/* Privacy Guarantee Card */}
      <section id="privacy-notice">
        <div className="bg-secondary-container/10 border border-secondary/20 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-on-surface mb-1">Your data stays on this device</p>
            <p className="text-micro text-on-surface-variant leading-relaxed">
              Transactions, budgets and settings are stored locally in your browser. If you enable cloud backup, an encrypted copy is stored in Firestore for restore across devices.
            </p>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section id="danger-zone" className="pt-4 border-t border-outline-variant/10">
        <p className="text-micro text-tertiary font-bold mb-3 text-center">Danger Zone</p>
        <div className="space-y-2">
          <button
            onClick={() => setShowResetLocalDialog(true)}
            className="w-full min-h-12 px-4 flex items-center justify-center text-tertiary font-headline font-extrabold text-xs border border-dashed border-tertiary/30 rounded-2xl hover:bg-tertiary/5 transition-colors"
          >
            Cancella dati locali
          </button>
          <button
            onClick={() => setShowResetAllDialog(true)}
            className="w-full min-h-12 px-4 flex items-center justify-center text-tertiary font-headline font-extrabold text-xs border border-dashed border-tertiary/30 rounded-2xl hover:bg-tertiary/5 transition-colors"
          >
            Cancella tutto (locale + backup cloud)
          </button>
        </div>
      </section>

      <ConfirmDialog
        isOpen={showResetLocalDialog}
        title="Cancella dati locali"
        message="Verranno cancellati tutti i dati dal dispositivo (transazioni, budget, ricorrenti, impostazioni). Il backup nel cloud resterà disponibile e ti verrà proposto al prossimo accesso."
        confirmLabel="Cancella dati locali"
        variant="danger"
        onConfirm={handleResetLocal}
        onCancel={() => setShowResetLocalDialog(false)}
      />

      <ConfirmDialog
        isOpen={showResetAllDialog}
        title="⚠️ Cancellazione totale"
        message="Verranno cancellati TUTTI i dati: dal dispositivo e dal backup nel cloud. Questa azione è irreversibile. Sei assolutamente sicuro?"
        confirmLabel="Sì, cancella tutto"
        variant="danger"
        onConfirm={handleResetAll}
        onCancel={() => setShowResetAllDialog(false)}
      />

      <ExportArchiveDialog
        isOpen={showExportArchiveDialog}
        data={portableAppData}
        onClose={() => setShowExportArchiveDialog(false)}
      />

      <ImportArchiveDialog
        isOpen={showImportArchiveDialog}
        onClose={() => setShowImportArchiveDialog(false)}
        onPrepared={({ prepared, passphrase }) => {
          setShowImportArchiveDialog(false);
          setRestoreCandidate({ prepared, passphrase });
        }}
      />

      {restoreCandidate && (
        <RestoreArchiveConfirmDialog
          isOpen
          prepared={restoreCandidate.prepared}
          archivePassphrase={restoreCandidate.passphrase}
          onCancel={() => setRestoreCandidate(null)}
          onComplete={() => window.location.reload()}
        />
      )}

      <CloudBackupRestoreDialog
        isOpen={showCloudRestoreDialog}
        versions={backupVersions}
        isLoading={backupVersionsLoading}
        onClose={() => setShowCloudRestoreDialog(false)}
        onRestore={handleCloudRestore}
      />
    </motion.div>
  );
}
