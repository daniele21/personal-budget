import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, BellRing, CheckCheck, ChevronRight, X, AlertTriangle, RefreshCw, CalendarClock, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationRecord } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { formatDate } from '../utils/formatters';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { usePaymentDetection } from '../state/PaymentDetectionProvider';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const ICONS: Record<NotificationRecord['type'], React.ReactNode> = {
  budget: <AlertTriangle className="w-4 h-4" />,
  recurring: <RefreshCw className="w-4 h-4" />,
  reminder: <CalendarClock className="w-4 h-4" />,
  system: <Info className="w-4 h-4" />,
};

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const { candidates } = usePaymentDetection();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen, onClose);

  useEffect(() => {
    if (isOpen) notifications.markAllRead();
  }, [isOpen]);

  const handleSelect = (record: NotificationRecord) => {
    navigate(record.route);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[180] bg-black/30 px-4 pt-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-center-title"
            className="ml-auto max-w-md rounded-3xl bg-surface-container-lowest border border-outline-variant/10 shadow-2xl overflow-hidden"
            initial={{ y: -12, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -12, scale: 0.98 }}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <div>
                  <p id="notification-center-title" className="text-sm font-bold text-on-surface">Notifications</p>
                  <p className="text-micro text-on-surface-variant">Local alerts and reminders</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={notifications.markAllRead} className="w-10 h-10 rounded-xl hover:bg-surface-container-high flex items-center justify-center" aria-label="Mark all read">
                  <CheckCheck className="w-5 h-5 text-primary" />
                </button>
                <button type="button" onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-surface-container-high flex items-center justify-center" aria-label="Close notifications">
                  <X className="w-5 h-5 text-on-surface-variant" />
                </button>
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-3">
              {candidates.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    navigate('/payment-detection');
                    onClose();
                  }}
                  className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-primary/8 p-3 text-left transition-colors hover:bg-primary/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label={`Open ${candidates.length} ${candidates.length === 1 ? 'payment' : 'payments'} to review`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
                    <BellRing className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-primary">
                      {candidates.length} {candidates.length === 1 ? 'payment' : 'payments'} to review
                    </span>
                    <span className="block text-xs text-on-surface-variant">
                      Native candidates are shown live and are not copied into notification history.
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                </button>
              )}
              {notifications.records.length === 0 && candidates.length === 0 ? (
                <p className="py-10 text-center text-sm text-on-surface-variant">No notifications yet.</p>
              ) : notifications.records.length > 0 ? (
                <div className="space-y-2">
                  {notifications.records.map((record) => (
                    <button key={record.id} type="button" onClick={() => handleSelect(record)} className="w-full flex items-start gap-3 rounded-2xl p-3 text-left hover:bg-surface-container-low transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        {ICONS[record.type]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-on-surface">{record.title}</p>
                        <p className="text-xs text-on-surface-variant leading-relaxed">{record.body}</p>
                        <p className="mt-1 text-micro text-on-surface-variant/70">{formatDate(record.createdAt)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
