import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LensSelectorProps {
  value: 'actual' | 'normalized';
  onChange: (value: 'actual' | 'normalized') => void;
  className?: string;
}

export function LensSelector({ value, onChange, className }: LensSelectorProps) {
  return (
    <div className={cn("relative flex items-center p-0.5 bg-surface-container-high rounded-full border border-outline-variant/10 shadow-inner w-full max-w-xs mx-auto", className)}>
      {/* Sliding background indicator */}
      <div 
        className={cn(
          "absolute top-0.5 bottom-0.5 rounded-full bg-surface-container-lowest shadow-sm transition-all duration-300 ease-out",
          value === 'normalized' ? "left-0.5 w-[calc(50%-2px)]" : "left-[calc(50%+1px)] w-[calc(50%-2px)]"
        )}
      />
      
      {/* Net Button */}
      <button
        type="button"
        aria-label="Net"
        onClick={() => onChange('normalized')}
        className={cn(
          "relative flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-full transition-all duration-200 z-10 cursor-pointer active:scale-95 focus:outline-none",
          value === 'normalized' ? "text-primary font-bold" : "text-on-surface-variant hover:text-on-surface font-medium"
        )}
      >
        <ShieldCheck className={cn("h-3 w-3 transition-transform", value === 'normalized' ? "scale-110 text-primary" : "text-on-surface-variant/70")} />
        <div className="text-left flex flex-col">
          <span className="text-xs font-bold leading-none">Net</span>
          <span className="text-micro text-on-surface-variant/60 font-semibold mt-0.5 leading-none">Regular budget</span>
        </div>
      </button>

      {/* With Extras Button */}
      <button
        type="button"
        aria-label="With Extras"
        onClick={() => onChange('actual')}
        className={cn(
          "relative flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-full transition-all duration-200 z-10 cursor-pointer active:scale-95 focus:outline-none",
          value === 'actual' ? "text-accent-amber font-bold" : "text-on-surface-variant hover:text-on-surface font-medium"
        )}
      >
        <Sparkles className={cn("h-3 w-3 transition-transform", value === 'actual' ? "scale-110 text-accent-amber" : "text-on-surface-variant/70")} />
        <div className="text-left flex flex-col">
          <span className="text-xs font-bold leading-none">With Extras</span>
          <span className="text-micro text-on-surface-variant/60 font-semibold mt-0.5 leading-none">Total spend</span>
        </div>
      </button>
    </div>
  );
}
