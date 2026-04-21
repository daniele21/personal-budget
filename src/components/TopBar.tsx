import React, { useEffect } from 'react';
import { Menu, Bell, Sun, Moon, Calendar as CalendarIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

interface TopBarProps {
  title: string;
  showMenu?: boolean;
  showProfile?: boolean;
}

export const TopBar = ({ title, showMenu = false, showProfile = true }: TopBarProps) => {
  const { isDarkMode: isDark, setIsDarkMode: setIsDark, user } = useApp();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 py-3 h-16 border-b border-outline-variant/10">
      <div className="flex items-center gap-2 sm:gap-3">
        {showMenu ? (
          <button className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
            <Menu className="w-5 h-5 text-primary" />
          </button>
        ) : (
          <CalendarIcon className="w-5 h-5 text-primary" />
        )}
        <h1 className="font-headline font-bold text-base sm:text-lg text-primary truncate flex-1 ml-1">{title}</h1>
      </div>
      <div className="flex items-center gap-1 sm:gap-4">
        <button 
          onClick={() => setIsDark(!isDark)}
          className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun className="w-5 h-5 text-primary" /> : <Moon className="w-5 h-5 text-primary" />}
        </button>
        <button className="p-2 hover:bg-surface-container-low rounded-full transition-colors relative" aria-label="Notifications">
          <Bell className="w-5 h-5 text-primary" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-tertiary rounded-full border border-surface" aria-hidden="true"></span>
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
  );
};
