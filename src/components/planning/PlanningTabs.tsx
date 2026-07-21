import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

export type PlanningView = 'calendar' | 'recurring';

const PLANNING_VIEWS: Array<{ value: PlanningView; label: string; path: string }> = [
  { value: 'calendar', label: 'Calendar', path: '/planning' },
  { value: 'recurring', label: 'Recurring', path: '/planning/recurring' },
];

export function PlanningTabs({ activeView }: { activeView: PlanningView }) {
  return (
    <nav
      aria-label="Planning views"
      className="grid grid-cols-2 rounded-xl border border-outline-variant/20 bg-surface-container-low p-1"
    >
      {PLANNING_VIEWS.map((view) => (
        <Link
          key={view.value}
          to={view.path}
          aria-current={activeView === view.value ? 'page' : undefined}
          className={cn(
            'flex min-h-9 items-center justify-center rounded-lg px-3 text-xs font-bold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
            activeView === view.value
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface',
          )}
        >
          {view.label}
        </Link>
      ))}
    </nav>
  );
}
