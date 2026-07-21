import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

export type ReportView = 'overview' | 'categories' | 'compare' | 'year';

const REPORT_VIEWS: Array<{ value: ReportView; label: string; path: string }> = [
  { value: 'overview', label: 'Overview', path: '/reports' },
  { value: 'categories', label: 'Categories', path: '/reports/categories' },
  { value: 'compare', label: 'Compare', path: '/reports/compare' },
  { value: 'year', label: 'Year', path: '/reports/year' },
];

export function ReportTabs({ activeView }: { activeView: ReportView }) {
  return (
    <nav
      aria-label="Report views"
      className="grid grid-cols-4 rounded-xl border border-outline-variant/20 bg-surface-container-low p-1"
    >
      {REPORT_VIEWS.map((view) => (
        <Link
          key={view.value}
          to={view.path}
          aria-current={activeView === view.value ? 'page' : undefined}
          className={cn(
            'flex min-h-9 min-w-0 items-center justify-center rounded-lg px-1.5 text-[11px] font-bold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
            activeView === view.value
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface',
          )}
        >
          <span className="truncate">{view.label}</span>
        </Link>
      ))}
    </nav>
  );
}
