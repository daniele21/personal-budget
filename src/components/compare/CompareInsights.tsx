import React from 'react';
import { Lightbulb } from 'lucide-react';

export function CompareInsights({ insights, sourceLabel }: { insights: string[]; sourceLabel: string }) {
  return (
    <div className="rounded-2xl border border-secondary/20 bg-secondary-container/10 p-4">
      <div className="mb-3 flex items-start gap-2">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
        <div>
          <h3 className="text-sm font-bold text-on-surface">Key changes</h3>
          <p className="text-[10px] font-semibold text-on-surface-variant">Source: {sourceLabel}</p>
        </div>
      </div>
      {insights.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Add transactions in both periods to generate useful insights.</p>
      ) : (
        <ul className="space-y-2">
          {insights.slice(0, 2).map((insight) => (
            <li key={insight} className="text-sm text-on-surface">• {insight}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
