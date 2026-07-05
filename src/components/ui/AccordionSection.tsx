import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AccordionSectionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  statusColor?: 'primary' | 'secondary' | 'warning' | 'danger';
  summary?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const statusClasses = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  warning: 'bg-accent-amber',
  danger: 'bg-tertiary',
};

export function AccordionSection({
  title,
  count,
  defaultOpen = false,
  statusColor,
  summary,
  children,
  className,
}: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-accordion`;

  return (
    <section className={cn('rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm shadow-primary/5', className)}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <span className="flex min-w-0 items-center gap-2">
          {statusColor && <span className={cn('h-2 w-2 shrink-0 rounded-full', statusClasses[statusColor])} />}
          <span className="min-w-0 truncate text-sm font-bold text-on-surface">{title}</span>
          {typeof count === 'number' && (
            <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-micro font-bold text-on-surface-variant">
              {count}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {summary}
          <ChevronDown className={cn('h-4 w-4 text-on-surface-variant transition-transform', isOpen && 'rotate-180')} />
        </span>
      </button>
      {isOpen && (
        <div id={contentId} className="border-t border-outline-variant/10 px-4 py-3">
          {children}
        </div>
      )}
    </section>
  );
}
