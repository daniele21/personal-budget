import React from 'react';
import { cn } from '../../lib/utils';
import { getCategoryTheme } from '../../config/categoryThemes';

interface CategoryBadgeProps {
  category: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  iconClassName?: string;
}

const sizeClasses = {
  sm: 'w-7 h-7 rounded-lg',
  md: 'w-9 h-9 rounded-xl',
  lg: 'w-11 h-11 rounded-2xl',
};

const iconSizeClasses = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const CategoryBadge = ({ 
  category, 
  size = 'md', 
  className,
  iconClassName
}: CategoryBadgeProps) => {
  const theme = getCategoryTheme(category);
  const Icon = theme.icon;

  return (
    <div 
      className={cn(
        "flex items-center justify-center shrink-0", 
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: theme.bgColor }}
    >
      <Icon 
        className={cn(iconSizeClasses[size], iconClassName)} 
        style={{ color: theme.color }} 
      />
    </div>
  );
};
