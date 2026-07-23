import React from 'react';
import { AnalyticsLensControl, PrimaryAnalyticsLens } from './AnalyticsLensControl';

interface LensSelectorProps {
  value: PrimaryAnalyticsLens;
  onChange: (value: PrimaryAnalyticsLens) => void;
  showInfo?: boolean;
  className?: string;
}

export function LensSelector({ value, onChange, showInfo, className }: LensSelectorProps) {
  return (
    <AnalyticsLensControl
      value={value}
      onChange={(nextValue) => onChange(nextValue as PrimaryAnalyticsLens)}
      mode="compact"
      showInfo={showInfo}
      className={className}
    />
  );
}
