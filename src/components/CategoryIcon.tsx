import React from 'react';
import { cn } from '../lib/utils';
import { getCategoryTheme } from '../config/categoryThemes';

export const CategoryIcon = ({ category, className }: { category: string, className?: string }) => {
  const theme = getCategoryTheme(category);
  const Icon = theme.icon;
  return <Icon className={cn("w-5 h-5", className)} style={className?.includes('text-') ? undefined : { color: theme.color }} />;
};
