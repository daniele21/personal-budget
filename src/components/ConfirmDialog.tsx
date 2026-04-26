import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen, onCancel);

  useEffect(() => {
    if (!isOpen) return;
    cancelRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-surface-container-lowest rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-outline-variant/10 space-y-5"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {variant === 'danger' && (
              <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-tertiary" />
              </div>
            )}
            <h3 id="confirm-dialog-title" className="font-headline font-bold text-on-surface text-lg">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        <p id="confirm-dialog-message" className="text-sm text-on-surface-variant leading-relaxed">{message}</p>

        <div className="flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl text-sm font-bold bg-surface-container-high text-on-surface-variant active:scale-95 transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm(); onCancel(); }}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold active:scale-95 transition-all shadow-md ${
              variant === 'danger'
                ? 'bg-tertiary text-white'
                : 'bg-primary text-on-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
