import React, { useEffect, useRef } from 'react';
import { Cloud, Database, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Button } from './ui/Button';

interface InitialDataDialogProps {
  isOpen: boolean;
  backupAvailable: boolean;
  onRestoreBackup: () => void;
  onStartBlank: () => void;
  onUseDemoData: () => void;
}

export function InitialDataDialog({
  isOpen,
  backupAvailable,
  onRestoreBackup,
  onStartBlank,
  onUseDemoData,
}: InitialDataDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const demoButtonRef = useRef<HTMLButtonElement>(null);
  useFocusTrap(dialogRef, isOpen, onStartBlank);

  useEffect(() => {
    if (!isOpen) return;
    demoButtonRef.current?.focus();
  }, [isOpen]);

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
          <p className="text-micro font-bold text-primary">Primo avvio</p>
          <h3 id="initial-data-title" className="font-headline text-xl font-extrabold text-on-surface">
            Come vuoi iniziare?
          </h3>
          <p id="initial-data-description" className="mt-1 text-xs leading-relaxed text-on-surface-variant">
            Non ci sono dati locali. Puoi usare dati dimostrativi, partire da zero
            {backupAvailable ? ' oppure ripristinare il backup cifrato trovato nel cloud.' : '.'}
          </p>
        </div>

        <div className="space-y-3">
          {backupAvailable && (
            <button
              type="button"
              onClick={onRestoreBackup}
              className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-left text-on-primary shadow-md shadow-primary/15 transition-all active:scale-[0.98]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Cloud className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-headline text-sm font-extrabold">Ripristina backup</span>
                <span className="block text-xs opacity-85">Recupera i dati cifrati salvati su Firestore.</span>
              </span>
            </button>
          )}

          <button
            ref={demoButtonRef}
            type="button"
            onClick={onUseDemoData}
            className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-secondary-container px-4 py-3 text-left text-on-secondary-container transition-all active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15">
              <Sparkles className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-headline text-sm font-extrabold">Usa dati demo</span>
              <span className="block text-xs opacity-80">Popola dashboard, budget, report e ricorrenze con esempi locali.</span>
            </span>
          </button>

          <Button type="button" variant="secondary" fullWidth onClick={onStartBlank}>
            <Database className="h-4 w-4" />
            Parti da zero
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
