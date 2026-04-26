import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { Button, Input } from './ui';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (input: { title: string; date: string; note?: string }) => void;
}

export function ReminderDialog({ isOpen, onClose, onAdd }: ReminderDialogProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen, onClose);

  const handleAdd = () => {
    if (!title.trim() || !date) return;
    onAdd({ title: title.trim(), date, note: note.trim() || undefined });
    setTitle('');
    setDate('');
    setNote('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[190] flex items-end sm:items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reminder-dialog-title"
            className="w-full max-w-md rounded-3xl bg-surface-container-lowest border border-outline-variant/10 p-5 shadow-2xl"
            initial={{ y: 24, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 24, scale: 0.98 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="reminder-dialog-title" className="font-headline text-lg font-bold text-primary">New reminder</h3>
              <button type="button" onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-surface-container-high flex items-center justify-center" aria-label="Close reminder dialog">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="space-y-3">
              <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Pay rent" />
              <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              <Input label="Note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional details" />
              <Button fullWidth onClick={handleAdd} disabled={!title.trim() || !date}>Create reminder</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
