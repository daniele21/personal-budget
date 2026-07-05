import React from 'react';
import { cn } from '../lib/utils';

interface RadialGaugeProps {
  percent: number;
  label: string;
  value: string;
}

export function RadialGauge({ percent, label, value }: RadialGaugeProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const centerX = 80;
  const centerY = 76;
  const radius = 56;
  const needleRadius = 42;
  const angle = 180 - (clamped / 100) * 180;
  const needleX = centerX + needleRadius * Math.cos((angle * Math.PI) / 180);
  const needleY = centerY - needleRadius * Math.sin((angle * Math.PI) / 180);

  const point = (degrees: number) => ({
    x: centerX + radius * Math.cos((degrees * Math.PI) / 180),
    y: centerY - radius * Math.sin((degrees * Math.PI) / 180),
  });

  const arc = (startAngle: number, endAngle: number) => {
    const start = point(startAngle);
    const end = point(endAngle);
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
  };

  const stateColor = clamped > 90 ? 'text-tertiary' : clamped > 75 ? 'text-accent-amber' : 'text-secondary';

  return (
    <div className="flex h-28 w-40 flex-col items-center justify-start" role="img" aria-label={`${label}: ${value}, ${Math.round(clamped)} percent used`}>
      <svg viewBox="0 0 160 108" className="h-20 w-full shrink-0 overflow-visible">
        <path
          d={arc(180, 0)}
          fill="none"
          stroke="var(--color-surface-container-highest)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={arc(180, 126)}
          fill="none"
          stroke="var(--color-accent-cyan)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path d={arc(113, 48)} fill="none" stroke="var(--color-secondary)" strokeWidth="14" strokeLinecap="round" />
        <path d={arc(35, 0)} fill="none" stroke="var(--color-accent-amber)" strokeWidth="14" strokeLinecap="round" />
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke="var(--color-primary)"
          strokeWidth="5"
          strokeLinecap="round"
          className="transition-all duration-700"
        />
        <circle cx={centerX} cy={centerY} r="7" fill="var(--color-surface-container-lowest)" stroke="var(--color-primary)" strokeWidth="5" />
      </svg>
      <div className="-mt-0.5 text-center">
        <p className={cn('font-headline text-base font-extrabold leading-none', stateColor)}>{value}</p>
        <p className="mt-1 text-micro font-bold leading-none text-on-surface-variant">{label}</p>
      </div>
    </div>
  );
}
