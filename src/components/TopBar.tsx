import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Sun, Moon, Calendar as CalendarIcon, Search } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';
import { useNotifications } from '../hooks/useNotifications';

interface TopBarProps {
  title: string;
  showMenu?: boolean;
  showProfile?: boolean;
}

export const TopBar = ({ title, showMenu = false, showProfile = true }: TopBarProps) => {
  const { isDarkMode: isDark, setIsDarkMode: setIsDark, user } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

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
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 py-3 h-16 border-b border-outline-variant/10">
        <div className="flex items-center gap-2 sm:gap-3">
          {isSubPage || showMenu ? (
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) navigate(-1);
                else navigate('/');
              }}
              className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
          ) : (
            <CalendarIcon className="w-5 h-5 text-primary" />
          )}
          <h1 className="font-headline font-bold text-base sm:text-lg text-primary truncate flex-1 ml-1">{title}</h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-4">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5 text-primary" />
          </button>
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="w-5 h-5 text-primary" /> : <Moon className="w-5 h-5 text-primary" />}
          </button>
          <button
            type="button"
            onClick={() => setIsNotificationCenterOpen(true)}
            className="p-2 hover:bg-surface-container-low rounded-full transition-colors relative"
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
            <Link to="/profile" className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-bold text-xs overflow-hidden border-2 border-surface shadow-sm ml-1 hover:ring-2 hover:ring-primary/30 transition-all" aria-label="Profile">
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
