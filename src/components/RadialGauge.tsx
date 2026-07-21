import React from 'react';

interface RadialGaugeProps {
  percent: number;
  label: string;
  value: string;
  hideText?: boolean;
  inverse?: boolean;
}

export function RadialGauge({ percent, label, value, hideText = false, inverse = false }: RadialGaugeProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const centerX = 80;
  const centerY = 76;
  const radius = 56;
  const needleRadius = 42;
  const angle = 180 - (clamped / 100) * 180;
  const needleX = centerX + needleRadius * Math.cos((angle * Math.PI) / 180);
  const needleY = centerY - needleRadius * Math.sin((angle * Math.PI) / 180);

  const arcPath = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`;
  const stateColor = percent > 100
    ? `var(--color-${inverse ? 'inverse-danger' : 'tertiary'})`
    : clamped > 80
      ? `var(--color-${inverse ? 'inverse-warning' : 'accent-amber'})`
      : `var(--color-${inverse ? 'inverse-positive' : 'secondary'})`;
  const trackColor = inverse
    ? 'color-mix(in srgb, var(--color-inverse-on-surface) 16%, transparent)'
    : 'var(--color-surface-container-high)';
  const needleColor = inverse ? 'var(--color-inverse-on-surface)' : 'var(--color-primary)';

  return (
    <div className="flex flex-col items-center justify-start" role="img" aria-label={`${label}: ${value}, ${Math.round(clamped)} percent used`}>
      <svg viewBox="0 0 160 88" className="h-16 w-32 shrink-0 overflow-visible">
        <path
          d={arcPath}
          fill="none"
          stroke={trackColor}
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d={arcPath}
          fill="none"
          stroke={stateColor}
          strokeWidth="12"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - clamped}
          className="transition-[stroke-dashoffset,stroke] duration-700 ease-out"
        />
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke={needleColor}
          strokeWidth="6"
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
        <circle cx={centerX} cy={centerY} r="6" fill={needleColor} />
      </svg>
      {!hideText && (
        <div className="-mt-0.5 text-center">
          <p className="font-headline text-base font-bold leading-none" style={{ color: stateColor }}>{value}</p>
          <p className={inverse ? 'mt-1 text-xs font-medium leading-none text-inverse-on-surface-variant' : 'mt-1 text-xs font-medium leading-none text-on-surface-variant'}>{label}</p>
        </div>
      )}
    </div>
  );
}
