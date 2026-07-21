import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart2, LayoutDashboard, MoreHorizontal, Plus, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Fixed bottom navigation bar — matches the Aura Finance mockup (Insights screens):
 *
 *  Home  Insights  [+]  Reports  More
 *
 * - Home     → /
 * - Insights → /insights   (overview, summary cards, cash flow chart)
 * - [+] FAB  → /add
 * - Reports  → /compare    (spending by category + compare & trends)
 * - More     → /more       (Transactions, Budgets, Calendar, Profile, …)
 */
export const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    {
      path: '/',
      icon: LayoutDashboard,
      label: 'Home',
      aliases: [] as string[],
    },
    {
      path: '/insights',
      icon: TrendingUp,
      label: 'Insights',
      aliases: [] as string[],
    },
    {
      path: '/compare',
      icon: BarChart2,
      label: 'Reports',
      aliases: ['/year-review'] as string[],
    },
    {
      path: '/more',
      icon: MoreHorizontal,
      label: 'More',
      aliases: [
        '/transactions',
        '/history',
        '/budgets',
        '/recurring',
        '/calendar',
        '/profile',
        '/admin',
      ] as string[],
    },
  ];

  const isItemActive = (item: (typeof navItems)[number]) =>
    location.pathname === item.path || item.aliases.includes(location.pathname);

  const isAddActive = location.pathname === '/add';

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        'aura-bottom-nav fixed bottom-0 z-50 w-full',
        'bg-surface-container-lowest/92 backdrop-blur-xl',
        'shadow-[0_-10px_30px_-24px_rgba(0,52,97,0.34)]',
        'safe-area-bottom',
      )}
    >
      {/* ── Floating action button (centre) ── */}
      <Link
        to="/add"
        aria-label="Add transaction"
        aria-current={isAddActive ? 'page' : undefined}
        className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-3"
      >
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full',
            'aura-fab text-on-primary',
            'shadow-[0_8px_24px_-8px_rgba(0,52,97,0.48)]',
            'transition-all hover:bg-primary-container active:scale-90',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25',
            isAddActive && 'ring-4 ring-primary/25',
          )}
        >
          <Plus className="h-5 w-5" />
        </div>
      </Link>

      {/* ── Tab items — 5-column grid with centre gap for FAB ── */}
      <div className="grid grid-cols-[1fr_1fr_64px_1fr_1fr] items-end px-1 pb-1 pt-2">
        {/* Left 2 tabs */}
        {navItems.slice(0, 2).map((item) => renderNavTab(item, isItemActive(item)))}

        {/* Centre spacer for FAB */}
        <div aria-hidden="true" />

        {/* Right 2 tabs */}
        {navItems.slice(2).map((item) => renderNavTab(item, isItemActive(item)))}
      </div>
    </nav>
  );
};

// ── NavTab sub-component ─────────────────────────────────────────────────────

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
  aliases: string[];
}

function renderNavTab(item: NavItem, isActive: boolean) {
  const Icon = item.icon;

  return (
    <Link
      key={item.path}
      to={item.path}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex flex-col items-center justify-end gap-0.5 py-1',
        'rounded-xl transition-colors active:opacity-75',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
      )}
    >
      {isActive && (
        <span className="absolute -top-2 h-1 w-7 rounded-full bg-[linear-gradient(90deg,var(--color-accent-cyan),var(--color-primary),var(--color-secondary))] shadow-[0_2px_8px_rgba(0,52,97,0.28)]" aria-hidden="true" />
      )}
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-xl text-on-surface-variant transition-all',
          isActive && 'bg-[linear-gradient(145deg,color-mix(in_srgb,var(--color-accent-cyan)_18%,transparent),color-mix(in_srgb,var(--color-primary)_10%,transparent))] text-primary shadow-[0_6px_16px_-12px_rgba(0,52,97,0.45)]',
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.75} />
      </div>

      {/* Label */}
      <span
        className={cn(
          'max-w-full truncate text-[11px] font-medium transition-colors',
          isActive ? 'text-primary' : 'text-on-surface-variant',
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}
