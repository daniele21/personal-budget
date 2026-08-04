import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  Compass,
  Database,
  Settings,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui';
import { pageTransition } from '../utils/motion';
import { getPlatformCapabilities } from '../platform/platformCapabilities';
import { TOUR_CATALOG, type TourId } from '../config/tourSteps';

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
    tourId: 'more-planning',
  },
  {
    to: '/data',
    label: 'Data & privacy',
    description: 'Manage backups, archives, CSV exports, and privacy controls.',
    icon: Database,
  },
  {
    to: '/settings',
    label: 'Settings',
    description: 'Manage monthly budget, categories, notifications, goals, and theme.',
    icon: Settings,
  },
];

export function MorePage() {
  const { isAdmin } = useApp();
  const [areToursExpanded, setAreToursExpanded] = useState(false);
  const androidLinks = getPlatformCapabilities().paymentDetectionSupported
    ? [
        {
          to: '/payment-detection',
          label: 'Payments to review',
          description: 'Review, edit, or ignore payments detected locally on Android.',
          icon: WalletCards,
        },
      ]
    : [];
  const userLinks = [...androidLinks, ...primaryLinks];
  const links = isAdmin
    ? [
        ...userLinks,
        {
          to: '/admin',
          label: 'Admin',
          description: 'Manage access allowlist and operational settings.',
          icon: ShieldCheck,
        },
      ]
    : userLinks;

  const handleStartTour = (tourId: TourId) => {
    window.dispatchEvent(new CustomEvent('aura:start-guided-tour', { detail: { tourId } }));
  };

  return (
    <motion.div {...pageTransition} className="space-y-4 pb-24">
      <section className="space-y-1 px-1">
        <p className="text-micro font-bold uppercase text-on-surface-variant">More</p>
        <h2 className="font-headline text-2xl font-extrabold text-primary">Tools and settings</h2>
      </section>

      <Card as="section" className="space-y-1 p-3" aria-label="Help and tours">
        <button
          type="button"
          onClick={() => setAreToursExpanded((current) => !current)}
          className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-expanded={areToursExpanded}
          aria-controls="help-and-tours-list"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <h3 className="font-headline text-base font-bold text-primary">Help & tours</h3>
            <p className="text-xs text-on-surface-variant">Choose one short guide. Each stays inside a single area.</p>
          </span>
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-primary transition-transform ${areToursExpanded ? 'rotate-90' : ''}`}
            aria-hidden="true"
          />
        </button>
        {areToursExpanded && (
          <div id="help-and-tours-list">
            {Object.values(TOUR_CATALOG).map((definition) => (
              <button
                key={definition.id}
                type="button"
                onClick={() => handleStartTour(definition.id)}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-all hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label={`Start ${definition.title} tour`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-on-surface">{definition.title}</span>
                  <span className="block text-xs text-on-surface-variant">{definition.steps.length} steps · {definition.description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card as="section" data-tour-id="more-tools" className="space-y-0 p-3">
        {links.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              data-tour-id={'tourId' in item ? item.tourId : undefined}
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

    </motion.div>
  );
}
