import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, LayoutDashboard, Plus, ReceiptText, WalletCards } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Primary mobile shell: four destinations around the Add transaction action.
 *
 *  Home  Transactions  [+]  Budgets  Reports
 */
export const BottomNav = () => {
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      path: '/',
      icon: LayoutDashboard,
      label: 'Home',
      aliases: [],
    },
    {
      path: '/transactions',
      icon: ReceiptText,
      label: 'Transactions',
      aliases: ['/history'],
    },
    {
      path: '/add',
      icon: Plus,
      label: 'Add transaction',
      aliases: [],
      action: true,
    },
    {
      path: '/budgets',
      icon: WalletCards,
      label: 'Budgets',
      aliases: [],
    },
    {
      path: '/reports',
      icon: BarChart3,
      label: 'Reports',
      aliases: ['/reports/categories', '/reports/compare', '/reports/year', '/insights', '/compare', '/year-review'],
    },
  ];

  const isItemActive = (item: NavItem) =>
    location.pathname === item.path || item.aliases.includes(location.pathname);

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 z-50 w-full border-t border-outline-variant/20 bg-surface-container-lowest safe-area-bottom"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-5 items-end pb-1 pt-1">
        {navItems.map((item, index) => (
          item.action
            ? <div key={item.path} data-nav-position={index === 2 ? 'center' : undefined}>{renderAddAction(item, isItemActive(item))}</div>
            : renderNavTab(item, isItemActive(item))
        ))}
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
  action?: boolean;
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
        'relative flex min-h-12 min-w-0 flex-col items-center justify-end gap-0.5 rounded-xl py-1',
        'transition-colors active:opacity-75',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
      )}
    >
      {isActive && (
        <span className="absolute top-0 h-0.5 w-5 rounded-full bg-primary" aria-hidden="true" />
      )}
      <div
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant transition-colors',
          isActive && 'text-primary',
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.4 : 1.8} />
      </div>

      <span
        className={cn(
          'max-w-full whitespace-nowrap font-medium leading-none tracking-tight transition-colors',
          'text-[clamp(0.5rem,2.4vw,0.6875rem)]',
          isActive ? 'font-semibold text-primary' : 'text-on-surface-variant',
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}

function renderAddAction(item: NavItem, isActive: boolean) {
  const Icon = item.icon;

  return (
    <Link
      key={item.path}
      to={item.path}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      className="flex min-h-12 min-w-0 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      <span
        className={cn(
          'flex h-14 w-14 -translate-y-5 items-center justify-center rounded-full bg-primary text-on-primary',
          'transition-transform active:scale-95',
          isActive && 'ring-4 ring-primary/20',
        )}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" strokeWidth={2.4} />
      </span>
    </Link>
  );
}
