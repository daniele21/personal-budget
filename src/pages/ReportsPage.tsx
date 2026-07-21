import React from 'react';
import { ReportTabs, ReportView } from '../components/reports/ReportTabs';
import { AnalyticsLensControl } from '../components/ui';
import { usePreferences } from '../state/PreferencesProvider';
import { ComparePage } from './ComparePage';
import { InsightsPage } from './InsightsPage';
import { YearReviewPage } from './YearReviewPage';

export function ReportsPage({ view }: { view: ReportView }) {
  const { reportsAnalyticsLens: analyticsLens, setReportsAnalyticsLens: setAnalyticsLens } = usePreferences();

  return (
    <div className="space-y-4">
      <ReportTabs activeView={view} />
      <AnalyticsLensControl
        value={analyticsLens}
        onChange={setAnalyticsLens}
        mode="full"
        className="w-full items-stretch"
      />
      {view === 'overview' && <InsightsPage analyticsLens={analyticsLens} onAnalyticsLensChange={setAnalyticsLens} showLensControl={false} />}
      {view === 'categories' && <ComparePage initialTab="spending" showViewSwitcher={false} analyticsLens={analyticsLens} onAnalyticsLensChange={setAnalyticsLens} showLensControl={false} />}
      {view === 'compare' && <ComparePage initialTab="compare" showViewSwitcher={false} analyticsLens={analyticsLens} onAnalyticsLensChange={setAnalyticsLens} showLensControl={false} />}
      {view === 'year' && <YearReviewPage analyticsLens={analyticsLens} onAnalyticsLensChange={setAnalyticsLens} showLensControl={false} />}
    </div>
  );
}
