import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, PlusCircle, BarChart3, Calendar, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

export const BottomNav = () => {
  const location = useLocation();
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Home' },
    { path: '/history', icon: History, label: 'History' },
    { path: '/add', icon: PlusCircle, label: 'Add', isSpecial: true },
    { path: '/insights', icon: BarChart3, label: 'Reports' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
  ];

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 w-full z-50 flex justify-around items-center px-2 py-2.5 bg-surface/90 backdrop-blur-2xl rounded-t-2xl border-t border-outline-variant/10 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] safe-area-bottom">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;

        if (item.isSpecial) {
          return (
            <Link key={item.path} to={item.path} aria-label={item.label} className="relative -top-5">
              <div className={cn(
                "w-11 h-11 rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center transition-all active:scale-90 bg-primary text-on-primary",
                isActive && "ring-4 ring-primary/20"
              )}>
                <Plus className="w-6 h-6" />
              </div>
            </Link>
          );
        }

        return (
          <Link 
            key={item.path} 
            to={item.path}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              "flex flex-col items-center justify-center min-w-[56px] py-1 rounded-2xl transition-all active:scale-90",
              isActive ? "text-primary" : "text-on-surface-variant"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-lg transition-colors",
              isActive ? "bg-primary/10" : "bg-transparent"
            )}>
              <Icon 
                className="w-5 h-5" 
                strokeWidth={isActive ? 2.5 : 2} 
              />
            </div>
            <span className={cn(
              "text-[10px] font-medium mt-1 transition-opacity",
              isActive ? "opacity-100" : "opacity-60"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
