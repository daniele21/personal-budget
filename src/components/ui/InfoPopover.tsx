import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BottomSheet } from './BottomSheet';

interface InfoPopoverProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  eyebrow?: string;
  ariaLabel?: string;
  className?: string;
  iconClassName?: string;
}

export function InfoPopover({
  title,
  subtitle,
  children,
  eyebrow,
  ariaLabel = 'More information',
  className,
  iconClassName,
}: InfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
          className,
        )}
      >
        <Info className={cn('h-3.5 w-3.5 text-primary', iconClassName)} />
      </button>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        eyebrow={eyebrow}
        subtitle={subtitle}
      >
        <div className="space-y-3 pt-1 text-xs leading-relaxed text-on-surface-variant">
          {children}
        </div>
      </BottomSheet>
    </>
  );
}
