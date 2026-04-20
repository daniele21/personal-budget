import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { APP_CONFIG } from '../constants';

interface NumericKeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (val: string) => void;
  initialValue: string;
}

export const NumericKeypadModal = ({ isOpen, onClose, onConfirm, initialValue }: NumericKeypadModalProps) => {
  const [value, setValue] = useState(initialValue === '0.00' ? '' : initialValue);

  const handleKey = (key: string) => {
    if (key === 'back') {
      setValue(prev => prev.slice(0, -1));
    } else if (key === '.') {
      if (!value.includes('.')) {
        setValue(prev => prev + '.');
      }
    } else {
      // Limit to 2 decimal places
      if (value.includes('.') && value.split('.')[1].length >= 2) return;
      setValue(prev => prev + key);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="w-full max-w-md bg-surface rounded-t-2xl sm:rounded-2xl p-8 space-y-8 shadow-2xl"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">Enter Amount</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        <div className="text-center py-8">
          <span className="text-primary text-5xl font-headline font-extrabold tracking-tighter">
            {APP_CONFIG.currency}{value || '0'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'].map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className={cn(
                "h-16 rounded-2xl flex items-center justify-center text-xl font-bold transition-all active:scale-90",
                key === 'back' ? "bg-surface-container-high text-tertiary" : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
              )}
            >
              {key === 'back' ? <ChevronLeft className="w-6 h-6" /> : key}
            </button>
          ))}
        </div>

        <button 
          onClick={() => {
            onConfirm(value || '0.00');
            onClose();
          }}
          className="w-full bg-primary text-on-primary py-4 rounded-2xl font-headline font-extrabold text-base shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
        >
          Confirm Amount
        </button>
      </motion.div>
    </div>
  );
};
