import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Card } from '../ui';

interface PeriodSelectorProps {
  monthA: Date;
  monthB: Date;
  onMonthAChange: (date: Date) => void;
  onMonthBChange: (date: Date) => void;
  onPreset: (preset: 'month' | 'quarter' | 'year') => void;
}

function monthValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function fromMonthValue(value: string): Date {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

export function PeriodSelector({ monthA, monthB, onMonthAChange, onMonthBChange, onPreset }: PeriodSelectorProps) {
  const shift = (target: 'a' | 'b', amount: number) => {
    const source = target === 'a' ? monthA : monthB;
    const next = new Date(source.getFullYear(), source.getMonth() + amount, 1);
    if (target === 'a') onMonthAChange(next);
    else onMonthBChange(next);
  };

  return (
    <Card className="space-y-4 p-4">
      <div className="grid grid-cols-3 gap-2">
        <Button size="sm" variant="secondary" onClick={() => onPreset('month')}>Month</Button>
        <Button size="sm" variant="secondary" onClick={() => onPreset('quarter')}>Quarter</Button>
        <Button size="sm" variant="secondary" onClick={() => onPreset('year')}>Year</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'Period A', value: monthA, onChange: onMonthAChange, target: 'a' as const },
          { label: 'Period B', value: monthB, onChange: onMonthBChange, target: 'b' as const },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl bg-surface-container-low p-3">
            <p className="text-micro font-bold text-on-surface-variant mb-2">{item.label}</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => shift(item.target, -1)} className="w-9 h-9 rounded-xl hover:bg-surface-container-high flex items-center justify-center" aria-label={`Previous ${item.label}`}>
                <ChevronLeft className="w-4 h-4 text-primary" />
              </button>
              <input
                type="month"
                value={monthValue(item.value)}
                onChange={(event) => item.onChange(fromMonthValue(event.target.value))}
                className="min-h-10 min-w-0 flex-1 rounded-xl border-none bg-surface-container-lowest px-3 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary"
              />
              <button type="button" onClick={() => shift(item.target, 1)} className="w-9 h-9 rounded-xl hover:bg-surface-container-high flex items-center justify-center" aria-label={`Next ${item.label}`}>
                <ChevronRight className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
