import React, { useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { GuidedTour } from './GuidedTour';
import { useApp } from '../context/AppContext';
import { useGuidedTour, wasTourCompleted } from '../hooks/useGuidedTour';
import { useNotificationScheduler } from '../hooks/useNotificationScheduler';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useToast } from './Toast';
import { haptics } from '../utils/haptics';
import { PaymentCandidateInboxBanner } from './payment-detection/PaymentCandidateInboxBanner';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

export const Layout = ({ children, title }: LayoutProps) => {
  const { transactions, recurring, budgetStatuses, isHydrated } = useApp();
  const { toast } = useToast();
  useNotificationScheduler({ transactions, recurring, budgetStatuses });
  useSwipeNavigation();

  const tour = useGuidedTour();

  // Listen for manual trigger from MorePage or auto-start on first access
  useEffect(() => {
    const handleStartTourEvent = () => {
      tour.startTour();
    };

    window.addEventListener('aura:start-guided-tour', handleStartTourEvent);
    return () => window.removeEventListener('aura:start-guided-tour', handleStartTourEvent);
  }, [tour]);

  // Auto-start on first access once app is hydrated
  useEffect(() => {
    if (!isHydrated) return;
    if (!wasTourCompleted()) {
      const timer = setTimeout(() => {
        tour.startTour();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isHydrated]);

  const pull = usePullToRefresh({
    onRefresh: () => {
      haptics.success();
      window.dispatchEvent(new CustomEvent('aura:refresh'));
      toast('Data refreshed from local storage', 'success');
    },
  });

  return (
    <div className="min-h-screen bg-surface transition-colors duration-300">
      {pull.distance > 16 && (
        <div
          className="pointer-events-none fixed left-1/2 top-14 z-[60] -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-micro font-bold text-on-primary shadow-lg transition-opacity"
          style={{ transform: `translate(-50%, ${Math.min(28, pull.distance / 4)}px)` }}
          aria-hidden="true"
        >
          {pull.isArmed ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      )}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-primary focus:text-on-primary focus:px-4 focus:py-2 focus:rounded-xl focus:font-bold focus:text-sm">
        Skip to content
      </a>
      <TopBar title={title} />
      <main id="main-content" className="mx-auto max-w-md px-4 pt-16 sm:max-w-xl sm:px-5 md:max-w-2xl">
        <PaymentCandidateInboxBanner />
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>
      <BottomNav />
      <GuidedTour
        isActive={tour.isActive}
        isTransitioning={tour.isTransitioning}
        transitionDestination={tour.transitionDestination}
        currentStepIndex={tour.currentStepIndex}
        currentStep={tour.currentStep}
        totalSteps={tour.totalSteps}
        targetRect={tour.targetRect}
        navigationRects={tour.navigationRects}
        transitionRect={tour.transitionRect}
        onNext={tour.nextStep}
        onPrev={tour.prevStep}
        onSkip={tour.skipTour}
      />
    </div>
  );
};
