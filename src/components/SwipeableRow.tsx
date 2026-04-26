import React from 'react';
import { motion, PanInfo } from 'motion/react';
import { Pencil, Trash2 } from 'lucide-react';
import { haptics } from '../utils/haptics';

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function SwipeableRow({ children, onEdit, onDelete }: SwipeableRowProps) {
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 88 && onEdit) {
      haptics.tap();
      onEdit();
    }
    if (info.offset.x < -88 && onDelete) {
      haptics.warning();
      onDelete();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest">
          <Pencil className="w-4 h-4" />
          Edit
        </div>
        <div className="flex items-center gap-2 text-tertiary text-xs font-bold uppercase tracking-widest">
          Delete
          <Trash2 className="w-4 h-4" />
        </div>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.995 }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}
