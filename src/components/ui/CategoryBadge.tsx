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
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-10 h-10 rounded-xl',
  lg: 'w-12 h-12 rounded-2xl',
};

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
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
