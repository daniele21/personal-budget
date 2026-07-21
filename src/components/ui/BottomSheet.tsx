import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface BottomSheetProps {
  isOpen: boolean;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  className?: string;
  contentClassName?: string;
}

export function BottomSheet({
  isOpen,
  title,
  eyebrow,
  subtitle,
  children,
  footer,
  onClose,
  className,
  contentClassName,
}: BottomSheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen, onClose);
  const titleId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-sheet-title`;

  const sheet = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[175] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label={`Close ${title}`} />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: 28, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 20, scale: 0.98 }}
            className={cn(
              'relative z-10 max-h-[88vh] w-full max-w-md overflow-hidden rounded-t-3xl border border-outline-variant/10 bg-surface-container-lowest shadow-2xl sm:rounded-3xl',
              className,
            )}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-outline-variant/50 sm:hidden" aria-hidden="true" />
            <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
              <div className="min-w-0">
                {eyebrow && <p className="text-micro font-bold uppercase text-primary">{eyebrow}</p>}
                <h3 id={titleId} className="font-headline text-lg font-extrabold text-on-surface">
                  {title}
                </h3>
                {subtitle && <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label={`Close ${title}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className={cn('max-h-[calc(88vh-8rem)] overflow-y-auto overscroll-contain px-5 pb-5', footer && 'pb-24', contentClassName)}>
              {children}
            </div>
            {footer && (
              <div className="absolute inset-x-0 bottom-0 border-t border-outline-variant/10 bg-surface-container-lowest/95 px-5 py-4 backdrop-blur">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document === 'undefined' ? sheet : createPortal(sheet, document.body);
}
