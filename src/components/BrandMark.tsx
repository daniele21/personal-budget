import React from 'react';
import { cn } from '../lib/utils';

interface BrandMarkProps {
  className?: string;
  iconClassName?: string;
  wordmark?: boolean;
  inverted?: boolean;
}

export function BrandMark({ className, iconClassName, wordmark = true, inverted = false }: BrandMarkProps) {
  const lightSrc = wordmark ? '/aura-logo-light.png' : '/logo.png';
  const darkSrc = wordmark ? '/aura-logo-dark.png' : '/logo-dark.png';
  const imageClassName = cn(
    wordmark ? 'h-12 w-auto object-contain' : 'h-10 w-10 rounded-2xl object-cover',
    iconClassName,
  );

  return (
    <span className={cn('inline-flex items-center', className)} role="img" aria-label="Aura Finance">
      <img
        src={inverted ? darkSrc : lightSrc}
        alt=""
        className={cn(imageClassName, inverted ? undefined : 'aura-logo-light')}
        draggable={false}
        aria-hidden="true"
      />
      {!inverted && (
        <img
          src={darkSrc}
          alt=""
          className={cn(imageClassName, 'aura-logo-dark')}
          draggable={false}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
