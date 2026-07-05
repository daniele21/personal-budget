import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Cloud,
  ReceiptText,
  Settings,
  ShieldCheck,
  Trophy,
  UserCircle,
  WalletCards,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui';
import { pageTransition } from '../utils/motion';

/**
 * Primary links shown in the More page.
 *
 * Note: Insights and Reports are in the bottom nav directly,
 * so they do NOT appear here. Transactions and Budgets are here
 * since the nav slots are taken by Insights/Reports.
 */
const primaryLinks = [
  {
    to: '/transactions',
    label: 'Transactions',
    description: 'Browse, search, filter, and import transactions.',
    icon: ReceiptText,
  },
  {
    to: '/budgets',
    label: 'Budgets',
    description: 'Set category limits and track monthly progress.',
    icon: WalletCards,
  },
  {
    to: '/calendar',
    label: 'Calendar & recurring',
    description: 'Plan upcoming payments and recurring entries.',
    icon: CalendarDays,
  },
  {
    to: '/year-review',
    label: 'Year in Review',
    description: 'Scan annual highlights and spending shifts.',
    icon: Trophy,
  },
  {
    to: '/profile',
    label: 'Profile & backup',
    description: 'Manage account, categories, privacy, and backup.',
    icon: UserCircle,
  },
];

export function MorePage() {
  const { isAdmin, cloudBackupEnabled, backupStatus } = useApp();
  const links = isAdmin
    ? [
        ...primaryLinks,
        {
          to: '/admin',
          label: 'Admin',
          description: 'Manage access allowlist and operational settings.',
          icon: ShieldCheck,
        },
      ]
    : primaryLinks;

  return (
    <motion.div {...pageTransition} className="space-y-4 pb-24">
      <section className="space-y-1 px-1">
        <p className="text-micro font-bold uppercase text-on-surface-variant">More</p>
        <h2 className="font-headline text-2xl font-extrabold text-primary">Tools and settings</h2>
      </section>

      <Card as="section" className="space-y-0 p-3">
        {links.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2 transition-all hover:bg-surface-container-low active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                i < links.length - 1
                  ? 'border-b border-outline-variant/20'
                  : ''
              }`}
              aria-label={`Open ${item.label}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-on-surface">{item.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-on-surface-variant">
                  {item.description}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant" />
            </Link>
          );
        })}
      </Card>

      {/* ── Status cards ── */}
      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-3 shadow-sm shadow-primary/5">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            <Cloud className="h-4 w-4" />
          </div>
          <p className="text-micro font-bold uppercase text-on-surface-variant">Backup</p>
          <p className="mt-1 text-sm font-extrabold text-on-surface">
            {cloudBackupEnabled ? backupStatus : 'Local only'}
          </p>
        </div>
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-3 shadow-sm shadow-primary/5">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings className="h-4 w-4" />
          </div>
          <p className="text-micro font-bold uppercase text-on-surface-variant">Privacy</p>
          <p className="mt-1 text-sm font-extrabold text-on-surface">User controlled</p>
        </div>
      </section>
    </motion.div>
  );
}
