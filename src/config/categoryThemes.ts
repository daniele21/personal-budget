import {
  Bus,
  Dumbbell,
  Film,
  Home,
  Landmark,
  LucideIcon,
  PieChart,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Utensils,
  Wallet,
} from 'lucide-react';

export interface CategoryTheme {
  icon: LucideIcon;
  color: string;
}

const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  Housing: { icon: Home, color: 'var(--color-primary)' },
  Rent: { icon: Home, color: 'var(--color-primary)' },
  Groceries: { icon: ShoppingCart, color: 'var(--color-secondary)' },
  Dining: { icon: Utensils, color: 'var(--color-accent-amber)' },
  Transport: { icon: Bus, color: 'var(--color-accent-cyan)' },
  Entertainment: { icon: Film, color: 'var(--color-accent-pink)' },
  Health: { icon: Dumbbell, color: 'var(--color-tertiary)' },
  Salary: { icon: Wallet, color: 'var(--color-secondary)' },
  Utilities: { icon: Landmark, color: 'var(--color-accent-purple)' },
  Shopping: { icon: ShoppingBag, color: 'var(--color-accent-lime)' },
};

function hashCategory(category: string): number {
  return category.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0);
}

const FALLBACK_COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-tertiary)',
  'var(--color-accent-purple)',
  'var(--color-accent-amber)',
  'var(--color-accent-cyan)',
  'var(--color-accent-pink)',
  'var(--color-accent-lime)',
];

export function getCategoryTheme(category: string): CategoryTheme {
  return CATEGORY_THEMES[category] ?? {
    icon: category ? Tag : PieChart,
    color: FALLBACK_COLORS[hashCategory(category) % FALLBACK_COLORS.length],
  };
}
