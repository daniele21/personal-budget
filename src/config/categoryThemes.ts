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
  bgColor: string;
}

const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  Housing: { icon: Home, color: 'var(--color-primary)', bgColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' },
  Rent: { icon: Home, color: 'var(--color-primary)', bgColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' },
  Groceries: { icon: ShoppingCart, color: 'var(--color-secondary)', bgColor: 'color-mix(in srgb, var(--color-secondary) 15%, transparent)' },
  Dining: { icon: Utensils, color: 'var(--color-accent-amber)', bgColor: 'color-mix(in srgb, var(--color-accent-amber) 15%, transparent)' },
  Transport: { icon: Bus, color: 'var(--color-accent-cyan)', bgColor: 'color-mix(in srgb, var(--color-accent-cyan) 15%, transparent)' },
  Entertainment: { icon: Film, color: 'var(--color-accent-pink)', bgColor: 'color-mix(in srgb, var(--color-accent-pink) 15%, transparent)' },
  Health: { icon: Dumbbell, color: 'var(--color-tertiary)', bgColor: 'color-mix(in srgb, var(--color-tertiary) 15%, transparent)' },
  Salary: { icon: Wallet, color: 'var(--color-secondary)', bgColor: 'color-mix(in srgb, var(--color-secondary) 15%, transparent)' },
  Utilities: { icon: Landmark, color: 'var(--color-accent-purple)', bgColor: 'color-mix(in srgb, var(--color-accent-purple) 15%, transparent)' },
  Shopping: { icon: ShoppingBag, color: 'var(--color-accent-lime)', bgColor: 'color-mix(in srgb, var(--color-accent-lime) 15%, transparent)' },
};

function hashCategory(category: string): number {
  return category.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0);
}

const FALLBACK_COLORS = [
  { color: 'var(--color-primary)', bgColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' },
  { color: 'var(--color-secondary)', bgColor: 'color-mix(in srgb, var(--color-secondary) 15%, transparent)' },
  { color: 'var(--color-tertiary)', bgColor: 'color-mix(in srgb, var(--color-tertiary) 15%, transparent)' },
  { color: 'var(--color-accent-purple)', bgColor: 'color-mix(in srgb, var(--color-accent-purple) 15%, transparent)' },
  { color: 'var(--color-accent-amber)', bgColor: 'color-mix(in srgb, var(--color-accent-amber) 15%, transparent)' },
  { color: 'var(--color-accent-cyan)', bgColor: 'color-mix(in srgb, var(--color-accent-cyan) 15%, transparent)' },
  { color: 'var(--color-accent-pink)', bgColor: 'color-mix(in srgb, var(--color-accent-pink) 15%, transparent)' },
  { color: 'var(--color-accent-lime)', bgColor: 'color-mix(in srgb, var(--color-accent-lime) 15%, transparent)' },
];

export function getCategoryTheme(category: string): CategoryTheme {
  if (CATEGORY_THEMES[category]) {
    return CATEGORY_THEMES[category];
  }
  const fallback = FALLBACK_COLORS[hashCategory(category) % FALLBACK_COLORS.length];
  return {
    icon: category ? Tag : PieChart,
    color: fallback.color,
    bgColor: fallback.bgColor,
  };
}
