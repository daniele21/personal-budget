import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, PlusCircle, BarChart3, Calendar, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

export const BottomNav = () => {
  const location = useLocation();
  const sideNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Home' },
    { path: '/history', icon: History, label: 'History' },
    { path: '/insights', icon: BarChart3, label: 'Reports' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
  ];

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 w-full z-50 bg-surface/92 backdrop-blur-2xl rounded-t-2xl border-t border-outline-variant/30 shadow-[0_-10px_28px_rgba(0,52,97,0.07)] safe-area-bottom">
      <Link
        to="/add"
        aria-label="Add"
        aria-current={location.pathname === '/add' ? 'page' : undefined}
        className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-2"
      >
        <div className={cn(
          "flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/20 transition-all hover:bg-primary-container active:scale-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
          location.pathname === '/add' && "ring-4 ring-primary/20"
        )}>
          <Plus className="h-5 w-5" />
        </div>
      </Link>

      <div className="grid grid-cols-[1fr_1fr_64px_1fr_1fr] items-center px-2 py-1.5">
      {sideNavItems.map((item, index) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        const gridColumn = index < 2 ? index + 1 : index + 2;

        return (
          <Link 
            key={item.path} 
            to={item.path}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            style={{ gridColumn }}
            className={cn(
              "flex flex-col items-center justify-center min-w-[52px] py-0.5 rounded-xl transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
              isActive ? "text-primary" : "text-on-surface-variant"
            )}
          >
            <div className={cn(
              "p-1 rounded-lg transition-colors",
              isActive ? "bg-primary/10 shadow-sm shadow-primary/10" : "bg-transparent"
            )}>
              <Icon 
                className="h-4 w-4" 
                strokeWidth={isActive ? 2.5 : 2} 
              />
            </div>
            <span className={cn(
              "text-micro font-semibold mt-0.5 transition-opacity",
              isActive ? "opacity-100" : "opacity-60"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
      </div>
    </nav>
  );
};
