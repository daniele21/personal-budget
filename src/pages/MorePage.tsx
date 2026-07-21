import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  Cloud,
  FileUp,
  Moon,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, Switch } from '../components/ui';
import { PwaInstallButton } from '../components/PwaInstallButton';
import { pageTransition } from '../utils/motion';

/**
 * Primary links shown in the More page.
 *
 * This secondary tools/settings area is reached from the fixed header More action.
 * Reports stays in the bottom navigation and does not appear here.
 */
const primaryLinks = [
  {
    to: '/planning',
    label: 'Planning',
    description: 'Plan upcoming payments and recurring entries.',
    icon: CalendarDays,
  },
  {
    to: '/profile#data-management',
    label: 'Import & export',
    description: 'Move transaction and budget data in or out of Aura.',
    icon: FileUp,
  },
  {
    to: '/profile#privacy-backup',
    label: 'Privacy & backup',
    description: 'Review storage and encrypted backup controls.',
    icon: Cloud,
  },
  {
    to: '/profile#settings',
    label: 'Settings',
    description: 'Manage categories, goals, notifications, and account preferences.',
    icon: Settings,
  },
];

export function MorePage() {
  const { isAdmin, cloudBackupEnabled, backupStatus, isDarkMode, setIsDarkMode } = useApp();
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

      <Card as="section" className="flex items-center justify-between gap-4" aria-labelledby="appearance-title">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-primary">
            <Moon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 id="appearance-title" className="text-sm font-bold text-on-surface">Dark mode</h3>
            <p className="text-xs text-on-surface-variant">Use a darker interface theme</p>
          </div>
        </div>
        <Switch
          checked={isDarkMode}
          onChange={() => setIsDarkMode(!isDarkMode)}
          label="Toggle dark mode"
        />
      </Card>

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

      <PwaInstallButton />

      <section className="flex items-center gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3" aria-label="Privacy and backup status">
        <ShieldCheck className="h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-on-surface">Your data remains user controlled</p>
          <p className="text-xs text-on-surface-variant">{cloudBackupEnabled ? `Encrypted backup: ${backupStatus}` : 'Stored locally; cloud backup is off'}</p>
        </div>
      </section>
    </motion.div>
  );
}
