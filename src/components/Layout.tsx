import React from 'react';
import { AnimatePresence } from 'motion/react';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { useApp } from '../context/AppContext';
import { useNotificationScheduler } from '../hooks/useNotificationScheduler';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useToast } from './Toast';
import { haptics } from '../utils/haptics';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

export const Layout = ({ children, title }: LayoutProps) => {
  const { transactions, recurring, budgetStatuses } = useApp();
  const { toast } = useToast();
  useNotificationScheduler({ transactions, recurring, budgetStatuses });
  useSwipeNavigation();
  const pull = usePullToRefresh({
    onRefresh: () => {
      haptics.success();
      window.dispatchEvent(new CustomEvent('aura:refresh'));
      toast('Data refreshed from local storage', 'success');
    },
  });

  return (
    <div className="min-h-screen bg-surface transition-colors duration-300">
      <div
        className="fixed left-1/2 top-16 z-[60] -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-micro font-bold text-on-primary shadow-lg transition-opacity"
        style={{ opacity: pull.distance > 16 ? 1 : 0, transform: `translate(-50%, ${Math.min(28, pull.distance / 4)}px)` }}
        aria-hidden="true"
      >
        {pull.isArmed ? 'Release to refresh' : 'Pull to refresh'}
      </div>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-primary focus:text-on-primary focus:px-4 focus:py-2 focus:rounded-xl focus:font-bold focus:text-sm">
        Skip to content
      </a>
      <TopBar title={title} />
      <main id="main-content" className="pt-18 px-4 max-w-md mx-auto sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
};
