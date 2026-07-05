import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, MoreVertical, Search, SlidersHorizontal } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';
import { PwaInstallButton } from './PwaInstallButton';
import { useNotifications } from '../hooks/useNotifications';
import { BrandMark } from './BrandMark';

/**
 * Supported header variants for different pages.
 *
 * - `default`       — logo + page title + search/notification/avatar
 * - `dashboard`     — greeting + avatar on left, bell + search on right
 * - `transactions`  — large title "Transactions" + filter icon + search icon
 * - `budgets`       — large title "Budgets" + settings + more
 * - `back`          — back arrow + title (for sub-pages)
 */
export type TopBarVariant =
  | 'default'
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'insights'
  | 'reports'
  | 'back';

interface TopBarProps {
  title: string;
  /** Display variant — resolved automatically from route when omitted. */
  variant?: TopBarVariant;
  showProfile?: boolean;
}

/** Resolve the variant from the current route when not passed explicitly. */
function useVariant(explicitVariant?: TopBarVariant): TopBarVariant {
  const { pathname } = useLocation();
  if (explicitVariant) return explicitVariant;
  if (pathname === '/') return 'dashboard';
  if (pathname === '/transactions' || pathname === '/history') return 'transactions';
  if (pathname === '/budgets') return 'budgets';
  if (pathname === '/insights') return 'insights';
  if (pathname === '/compare' || pathname === '/year-review') return 'reports';
  // Sub-pages: any path that isn't a top-level nav tab
  const topLevel = ['/', '/transactions', '/history', '/budgets', '/insights', '/compare', '/more'];
  if (!topLevel.includes(pathname)) return 'back';
  return 'default';
}

export const TopBar = ({ title, variant: explicitVariant, showProfile = true }: TopBarProps) => {
  const { user } = useApp();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  const variant = useVariant(explicitVariant);

  const HomeLogoLink = ({ className = 'h-8 w-8' }: { className?: string }) => (
    <Link
      to="/"
      className="flex shrink-0 items-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label="Go to home"
    >
      <BrandMark wordmark={false} iconClassName={`${className} shadow-sm shadow-primary/10`} />
    </Link>
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isTyping =
        event.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
      const isShortcut =
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') ||
        (!isTyping && event.key === '/');
      if (isShortcut) {
        event.preventDefault();
        setIsSearchOpen(true);
        return;
      }
      if (isTyping || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === 'n') navigate('/add');
      if (event.key.toLowerCase() === 'b') navigate('/budgets');
      if (event.key.toLowerCase() === 't') navigate('/transactions');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  // ── Shared action buttons ───────────────────────────────────────────
  const SearchBtn = (
    <button
      type="button"
      onClick={() => setIsSearchOpen(true)}
      className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      aria-label="Search"
    >
      <Search className="h-4 w-4" />
    </button>
  );

  const NotificationBtn = (
    <button
      type="button"
      onClick={() => setIsNotificationCenterOpen(true)}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
      {notifications.unreadCount > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-surface bg-tertiary px-0.5 text-[9px] font-bold leading-4 text-on-primary">
          {notifications.unreadCount > 9 ? '9+' : notifications.unreadCount}
        </span>
      )}
    </button>
  );

  const AvatarLink = showProfile && user ? (
    <Link
      to="/profile"
      className="ml-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-primary-container text-xs font-bold text-on-primary shadow-sm transition-all hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label="Profile"
    >
      <img src={user.photoUrl} alt={user.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
    </Link>
  ) : null;

  // ── Back button (sub-pages) ─────────────────────────────────────────
  const BackBtn = (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) navigate(-1);
        else navigate('/');
      }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4 text-primary" />
    </button>
  );

  // ── Render header content per variant ──────────────────────────────

  // Dashboard: greeting "Ciao, Marco" with avatar left, actions right
  if (variant === 'dashboard') {
    const firstName = user?.name?.split(' ')[0] ?? 'Aura';
    return (
      <>
        <header className="fixed top-0 z-50 w-full border-b border-outline-variant/20 bg-surface/90 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,52,97,0.06)]">
          <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4 sm:max-w-xl sm:px-5 md:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
            {/* Left: brand icon + greeting */}
            <div className="flex min-w-0 items-center gap-2.5">
              <HomeLogoLink />
              <div className="min-w-0">
                <h1 className="min-w-0 truncate font-headline text-sm font-extrabold text-primary">
                  Ciao, {firstName} 👋
                </h1>
              </div>
            </div>
            {/* Right: PWA install + search + notifications + avatar */}
            <div className="flex shrink-0 items-center gap-0.5">
              <PwaInstallButton />
              {SearchBtn}
              {NotificationBtn}
              {AvatarLink}
            </div>
          </div>
        </header>
        <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        <NotificationCenter isOpen={isNotificationCenterOpen} onClose={() => setIsNotificationCenterOpen(false)} />
      </>
    );
  }

  // Transactions: large title + filter icon + search icon
  if (variant === 'transactions') {
    return (
      <>
        <header className="fixed top-0 z-50 w-full border-b border-outline-variant/20 bg-surface/90 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,52,97,0.06)]">
          <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4 sm:max-w-xl sm:px-5 md:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
            <div className="flex min-w-0 items-center gap-2.5">
              <HomeLogoLink />
              <h1 className="min-w-0 truncate font-headline text-xl font-extrabold text-primary">{title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {SearchBtn}
              {NotificationBtn}
            </div>
          </div>
        </header>
        <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        <NotificationCenter isOpen={isNotificationCenterOpen} onClose={() => setIsNotificationCenterOpen(false)} />
      </>
    );
  }

  // Insights overview
  if (variant === 'insights') {
    return (
      <>
        <header className="fixed top-0 z-50 w-full border-b border-outline-variant/20 bg-surface/90 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,52,97,0.06)]">
          <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4 sm:max-w-xl sm:px-5 md:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
            <div className="flex min-w-0 items-center gap-2.5">
              <HomeLogoLink />
              <h1 className="min-w-0 truncate font-headline text-xl font-extrabold text-primary">Insights</h1>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {SearchBtn}
              {NotificationBtn}
            </div>
          </div>
        </header>
        <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        <NotificationCenter isOpen={isNotificationCenterOpen} onClose={() => setIsNotificationCenterOpen(false)} />
      </>
    );
  }

  // Reports (Compare & Trends / Spending by Category)
  if (variant === 'reports') {
    return (
      <>
        <header className="fixed top-0 z-50 w-full border-b border-outline-variant/20 bg-surface/90 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,52,97,0.06)]">
          <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4 sm:max-w-xl sm:px-5 md:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
            <div className="flex min-w-0 items-center gap-2.5">
              <HomeLogoLink />
              <h1 className="min-w-0 truncate font-headline text-xl font-extrabold text-primary">{title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {SearchBtn}
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label="More options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
        <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        <NotificationCenter isOpen={isNotificationCenterOpen} onClose={() => setIsNotificationCenterOpen(false)} />
      </>
    );
  }

  // Budgets: large title + settings + more
  if (variant === 'budgets') {
    return (
      <>
        <header className="fixed top-0 z-50 w-full border-b border-outline-variant/20 bg-surface/90 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,52,97,0.06)]">
          <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4 sm:max-w-xl sm:px-5 md:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
            <div className="flex min-w-0 items-center gap-2.5">
              <HomeLogoLink />
              <h1 className="min-w-0 truncate font-headline text-xl font-extrabold text-primary">{title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label="Budget settings"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label="More options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
        <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        <NotificationCenter isOpen={isNotificationCenterOpen} onClose={() => setIsNotificationCenterOpen(false)} />
      </>
    );
  }

  // Back (sub-pages)
  if (variant === 'back') {
    return (
      <>
        <header className="fixed top-0 z-50 w-full border-b border-outline-variant/20 bg-surface/90 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,52,97,0.06)]">
          <div className="mx-auto flex h-14 max-w-md items-center gap-2 px-3 sm:max-w-xl sm:px-5 md:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
            {BackBtn}
            <HomeLogoLink />
            <h1 className="min-w-0 truncate font-headline text-base font-extrabold text-primary">
              {title}
            </h1>
            <div className="ml-auto flex shrink-0 items-center gap-0.5">
              {SearchBtn}
              {AvatarLink}
            </div>
          </div>
        </header>
        <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        <NotificationCenter isOpen={isNotificationCenterOpen} onClose={() => setIsNotificationCenterOpen(false)} />
      </>
    );
  }

  // Default: logo + title + full action bar
  return (
    <>
      <header className="fixed top-0 z-50 w-full border-b border-outline-variant/20 bg-surface/90 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,52,97,0.06)]">
        <div className="mx-auto flex h-14 max-w-md items-center gap-2.5 px-3 sm:max-w-xl sm:px-5 md:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <HomeLogoLink className="h-9 w-9" />
            <h1 className="min-w-0 truncate font-headline text-sm font-extrabold text-primary sm:text-base">
              {title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <PwaInstallButton />
            {SearchBtn}
            {NotificationBtn}
            {AvatarLink}
          </div>
        </div>
      </header>
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <NotificationCenter isOpen={isNotificationCenterOpen} onClose={() => setIsNotificationCenterOpen(false)} />
    </>
  );
};
