import React from 'react';
import { motion, PanInfo } from 'motion/react';
import { Pencil, Trash2 } from 'lucide-react';
import { haptics } from '../utils/haptics';

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * Swipeable gesture wrapper for transaction rows.
 *
 * - Swipe right → Edit (blue hint)
 * - Swipe left  → Delete (red hint)
 *
 * The inner content layer has an explicit `bg-surface` so the
 * action hints behind it are only revealed during the drag gesture.
 */
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
    <div className="relative overflow-hidden">
      {/* Behind-layer: action hints (only visible during swipe) */}
      <div className="absolute inset-0 grid grid-cols-2">
        <div className="flex items-center gap-2 bg-primary/10 px-4 text-xs font-bold text-primary">
          <Pencil className="h-4 w-4" />
          Edit
        </div>
        <div className="flex items-center justify-end gap-2 bg-tertiary/10 px-4 text-xs font-bold text-tertiary">
          Delete
          <Trash2 className="h-4 w-4" />
        </div>
      </div>

      {/* Front-layer: actual row content — explicit bg so hints stay hidden at rest */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.995 }}
        className="relative z-10 bg-surface"
      >
        {children}
      </motion.div>
    </div>
  );
}
