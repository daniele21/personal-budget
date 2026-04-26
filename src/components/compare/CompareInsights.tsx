import React from 'react';
import { Lightbulb } from 'lucide-react';

export function CompareInsights({ insights }: { insights: string[] }) {
  return (
    <div className="rounded-3xl bg-secondary-container/10 border border-secondary/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-secondary" />
        <p className="text-micro font-bold text-secondary">Key insights</p>
      </div>
      {insights.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Add transactions in both periods to generate useful insights.</p>
      ) : (
        <ul className="space-y-2">
          {insights.map((insight) => (
            <li key={insight} className="text-sm text-on-surface">• {insight}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
