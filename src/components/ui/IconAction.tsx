import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface IconActionProps {
  icon: React.ReactNode;
  label: string;
  to?: string;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

export function IconAction({ icon, label, to, onClick, className, ariaLabel }: IconActionProps) {
  const content = (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container-high text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
        {icon}
      </span>
      <span className="text-center text-micro font-bold leading-tight text-on-surface">{label}</span>
    </>
  );
  const classes = cn('group flex min-h-[68px] flex-col items-center justify-start gap-1.5 rounded-2xl px-2 py-2 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30', className);

  if (to) {
    return (
      <Link to={to} aria-label={ariaLabel ?? label} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel ?? label} className={classes}>
      {content}
    </button>
  );
}
