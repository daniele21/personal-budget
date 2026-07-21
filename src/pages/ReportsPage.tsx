import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { ReportTabs, ReportView } from '../components/reports/ReportTabs';
import { AnalyticsLensControl, BottomSheet } from '../components/ui';
import { usePreferences } from '../state/PreferencesProvider';
import { ComparePage } from './ComparePage';
import { InsightsPage } from './InsightsPage';
import { YearReviewPage } from './YearReviewPage';

export function ReportsPage({ view }: { view: ReportView }) {
  const { reportsAnalyticsLens: analyticsLens, setReportsAnalyticsLens: setAnalyticsLens } = usePreferences();
  const [isViewOptionsOpen, setIsViewOptionsOpen] = useState(false);
  const lensLabel = analyticsLens === 'actual'
    ? 'All spending'
    : analyticsLens === 'normalized'
      ? 'Without extras'
      : 'Extras only';

  return (
    <div className="space-y-4">
      <ReportTabs activeView={view} />
      <button
        type="button"
        aria-label={`View options, ${lensLabel}`}
        onClick={() => setIsViewOptionsOpen(true)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-on-surface">
          <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
          View options
        </span>
        <span className="text-xs font-semibold text-on-surface-variant">{lensLabel}</span>
      </button>
      {view === 'overview' && <InsightsPage analyticsLens={analyticsLens} onAnalyticsLensChange={setAnalyticsLens} showLensControl={false} />}
      {view === 'categories' && <ComparePage initialTab="spending" showViewSwitcher={false} analyticsLens={analyticsLens} onAnalyticsLensChange={setAnalyticsLens} showLensControl={false} />}
      {view === 'compare' && <ComparePage initialTab="compare" showViewSwitcher={false} analyticsLens={analyticsLens} onAnalyticsLensChange={setAnalyticsLens} showLensControl={false} />}
      {view === 'year' && <YearReviewPage analyticsLens={analyticsLens} onAnalyticsLensChange={setAnalyticsLens} showLensControl={false} />}
      <BottomSheet
        isOpen={isViewOptionsOpen}
        title="View options"
        subtitle="Choose which transactions are included in Reports."
        onClose={() => setIsViewOptionsOpen(false)}
      >
        <div className="space-y-3 pt-1">
          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Spending view</p>
          <AnalyticsLensControl
            value={analyticsLens}
            onChange={setAnalyticsLens}
            mode="full"
            className="w-full items-stretch"
          />
        </div>
      </BottomSheet>
    </div>
  );
}
