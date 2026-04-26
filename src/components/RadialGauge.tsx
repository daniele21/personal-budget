import React from 'react';

interface RadialGaugeProps {
  percent: number;
  label: string;
  value: string;
}

export function RadialGauge({ percent, label, value }: RadialGaugeProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 44;
  const circumference = Math.PI * radius;
  const dash = (clamped / 100) * circumference;

  return (
    <div className="relative h-28 w-40" role="img" aria-label={`${label}: ${value}, ${Math.round(clamped)} percent used`}>
      <svg viewBox="0 0 120 72" className="h-full w-full">
        <path
          d="M16 60a44 44 0 0 1 88 0"
          fill="none"
          stroke="var(--color-surface-container-highest)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M16 60a44 44 0 0 1 88 0"
          fill="none"
          stroke={clamped > 90 ? 'var(--color-tertiary)' : clamped > 75 ? 'var(--color-accent-amber)' : 'var(--color-secondary)'}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="font-headline text-lg font-extrabold text-on-surface">{value}</p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
      </div>
    </div>
  );
}
