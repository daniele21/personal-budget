import React from 'react';
import { AnalyticsLensControl, PrimaryAnalyticsLens } from './AnalyticsLensControl';

interface LensSelectorProps {
  value: PrimaryAnalyticsLens;
  onChange: (value: PrimaryAnalyticsLens) => void;
  className?: string;
}

export function LensSelector({ value, onChange, className }: LensSelectorProps) {
  return (
    <AnalyticsLensControl
      value={value}
      onChange={(nextValue) => onChange(nextValue as PrimaryAnalyticsLens)}
      mode="compact"
      className={className}
    />
  );
}
