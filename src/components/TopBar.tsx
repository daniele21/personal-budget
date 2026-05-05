import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Calendar as CalendarIcon, Search } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';
import { PwaInstallButton } from './PwaInstallButton';
import { useNotifications } from '../hooks/useNotifications';

interface TopBarProps {
  title: string;
  showMenu?: boolean;
  showProfile?: boolean;
}

export const TopBar = ({ title, showMenu = false, showProfile = true }: TopBarProps) => {
  const { user } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isTyping = event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
      const isShortcut = ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') || (!isTyping && event.key === '/');
      if (isShortcut) {
        event.preventDefault();
        setIsSearchOpen(true);
        return;
      }
      if (isTyping || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === 'n') navigate('/add');
      if (event.key.toLowerCase() === 'b') navigate('/budgets');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const isSubPage = location.pathname !== '/' && !['/history', '/insights', '/calendar'].includes(location.pathname);

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md flex items-center gap-3 px-4 sm:px-6 py-3 h-16 border-b border-outline-variant/10">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {isSubPage || showMenu ? (
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) navigate(-1);
                else navigate('/');
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
          ) : (
            <CalendarIcon className="h-5 w-5 shrink-0 text-primary" />
          )}
          <h1 className="min-w-0 truncate font-headline text-base font-bold text-primary sm:text-lg">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <PwaInstallButton />
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low"
            aria-label="Search"
          >
            <Search className="w-5 h-5 text-primary" />
          </button>
          <button
            type="button"
            onClick={() => setIsNotificationCenterOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-primary" />
            {notifications.unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 bg-tertiary text-on-primary rounded-full border border-surface text-micro font-bold leading-4 text-center">
                {notifications.unreadCount > 9 ? '9+' : notifications.unreadCount}
              </span>
            )}
          </button>
          {showProfile && user && (
            <Link to="/profile" className="ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-primary-container text-xs font-bold text-on-primary shadow-sm transition-all hover:ring-2 hover:ring-primary/30 sm:ml-1" aria-label="Profile">
              <img
                src={user.photoUrl}
                alt={user.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </Link>
          )}
        </div>
      </header>
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <NotificationCenter isOpen={isNotificationCenterOpen} onClose={() => setIsNotificationCenterOpen(false)} />
    </>
  );
};
