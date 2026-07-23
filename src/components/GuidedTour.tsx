import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { TourPlacement, TourStep } from '../config/tourSteps';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface GuidedTourProps {
  isActive: boolean;
  isTransitioning: boolean;
  transitionDestination: string | null;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
  targetRect: DOMRect | null;
  navigationRects: DOMRect[];
  transitionRect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

interface TourLayoutInput {
  targetRect: Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height'>;
  viewportWidth: number;
  viewportHeight: number;
  panelHeight: number;
  preferredPlacement?: TourPlacement;
  spotlightPadding?: number;
}

export interface TourLayout {
  spotlightTop: number;
  spotlightLeft: number;
  spotlightWidth: number;
  spotlightHeight: number;
  panelTop: number;
  panelPlacement: 'top' | 'bottom';
}

const clamp = (value: number, min: number, max: number) => (
  Math.min(Math.max(value, min), Math.max(min, max))
);

const navigationRadius = (rect: Pick<DOMRect, 'width' | 'height'>) => (
  Math.abs(rect.width - rect.height) < 12 ? 999 : Math.min(16, rect.height / 2)
);

/**
 * Keeps both the highlighted feature and the explanation inside the viewport.
 * Very tall feature regions are intentionally windowed to a visible slice so
 * the explanation never covers the entire component on small screens.
 */
export function calculateTourLayout({
  targetRect,
  viewportWidth,
  viewportHeight,
  panelHeight,
  preferredPlacement = 'auto',
  spotlightPadding = 8,
}: TourLayoutInput): TourLayout {
  const viewportMargin = viewportWidth < 640 ? 12 : 20;
  const gap = 12;
  const maxSpotlightHeight = Math.min(320, viewportHeight * 0.36);
  const desiredSpotlightHeight = Math.min(
    targetRect.height + spotlightPadding * 2,
    maxSpotlightHeight,
  );
  const desiredSpotlightWidth = Math.min(
    targetRect.width + spotlightPadding * 2,
    viewportWidth - viewportMargin * 2,
  );

  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const spotlightLeft = clamp(
    targetCenterX - desiredSpotlightWidth / 2,
    viewportMargin,
    viewportWidth - viewportMargin - desiredSpotlightWidth,
  );
  let spotlightTop = clamp(
    targetCenterY - desiredSpotlightHeight / 2,
    viewportMargin,
    viewportHeight - viewportMargin - desiredSpotlightHeight,
  );
  let spotlightBottom = spotlightTop + desiredSpotlightHeight;

  const safePanelHeight = Math.min(panelHeight || 232, viewportHeight - viewportMargin * 2);
  const topSpace = spotlightTop - viewportMargin - gap;
  const bottomSpace = viewportHeight - spotlightBottom - viewportMargin - gap;
  const preferredFits = preferredPlacement === 'top'
    ? topSpace >= safePanelHeight
    : preferredPlacement === 'bottom'
      ? bottomSpace >= safePanelHeight
      : false;

  let panelPlacement: 'top' | 'bottom';
  if (preferredFits && preferredPlacement !== 'auto') {
    panelPlacement = preferredPlacement;
  } else if (topSpace >= safePanelHeight || bottomSpace >= safePanelHeight) {
    panelPlacement = bottomSpace >= safePanelHeight ? 'bottom' : 'top';
  } else {
    panelPlacement = bottomSpace >= topSpace ? 'bottom' : 'top';
  }

  // If neither side initially fits, shift the visible spotlight slice just
  // enough to reserve a non-overlapping panel region.
  if (panelPlacement === 'bottom' && bottomSpace < safePanelHeight) {
    spotlightTop = clamp(
      viewportHeight - viewportMargin - safePanelHeight - gap - desiredSpotlightHeight,
      viewportMargin,
      viewportHeight - viewportMargin - desiredSpotlightHeight,
    );
  } else if (panelPlacement === 'top' && topSpace < safePanelHeight) {
    spotlightTop = clamp(
      viewportMargin + safePanelHeight + gap,
      viewportMargin,
      viewportHeight - viewportMargin - desiredSpotlightHeight,
    );
  }
  spotlightBottom = spotlightTop + desiredSpotlightHeight;

  const desiredPanelTop = panelPlacement === 'top'
    ? spotlightTop - gap - safePanelHeight
    : spotlightBottom + gap;
  const panelTop = clamp(
    desiredPanelTop,
    viewportMargin,
    viewportHeight - viewportMargin - safePanelHeight,
  );

  return {
    spotlightTop,
    spotlightLeft,
    spotlightWidth: desiredSpotlightWidth,
    spotlightHeight: desiredSpotlightHeight,
    panelTop,
    panelPlacement,
  };
}

export function GuidedTour({
  isActive,
  isTransitioning,
  transitionDestination,
  currentStepIndex,
  currentStep,
  totalSteps,
  targetRect,
  navigationRects,
  transitionRect,
  onNext,
  onPrev,
  onSkip,
}: GuidedTourProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(232);
  useFocusTrap(panelRef, isActive && !isTransitioning, onSkip);

  useLayoutEffect(() => {
    if (!isActive || !panelRef.current) return;

    const panel = panelRef.current;
    const updatePanelHeight = () => setPanelHeight(panel.getBoundingClientRect().height);
    updatePanelHeight();

    const observer = new ResizeObserver(updatePanelHeight);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [currentStep?.id, isActive, isTransitioning]);

  useEffect(() => {
    if (!isActive || isTransitioning) return;
    panelRef.current
      ?.querySelector<HTMLElement>('[data-autofocus="true"]')
      ?.focus({ preventScroll: true });
  }, [currentStepIndex, isActive, isTransitioning]);

  // Keyboard navigation supplements the visible controls. Enter is left to the
  // focused button so one key press cannot advance two steps.
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onNext, onPrev]);

  if (!isActive || !currentStep) return null;

  if (isTransitioning) {
    const transitionNavigationRects = transitionRect ? [transitionRect] : [];
    const transitionContent = (
      <div
        className="fixed inset-0 z-[220] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Guided Tour"
        data-tour-transition="true"
      >
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <mask id="tour-transition-navigation-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {transitionNavigationRects.map((rect, index) => (
                <rect
                  key={`${rect.left}-${rect.top}-${index}`}
                  x={Math.max(0, rect.left - 6)}
                  y={Math.max(0, rect.top - 6)}
                  width={rect.width + 12}
                  height={rect.height + 12}
                  rx={navigationRadius(rect)}
                  ry={navigationRadius(rect)}
                  fill="black"
                />
              ))}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.76)"
            mask="url(#tour-transition-navigation-mask)"
          />
        </svg>
        {transitionNavigationRects.map((rect, index) => (
          <motion.div
            key={`${rect.left}-${rect.top}-${index}`}
            data-tour-navigation-highlight="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className="pointer-events-none fixed border-2 border-primary ring-4 ring-primary/25 shadow-[0_0_24px_rgba(var(--color-primary-rgb),0.7)]"
            style={{
              top: Math.max(0, rect.top - 6),
              left: Math.max(0, rect.left - 6),
              width: rect.width + 12,
              height: rect.height + 12,
              borderRadius: navigationRadius(rect),
            }}
          />
        ))}
        <span
          className="sr-only"
          role="status"
          aria-live="polite"
        >
          Selected {transitionDestination ?? currentStep.section}
        </span>
      </div>
    );

    return typeof document === 'undefined'
      ? transitionContent
      : createPortal(transitionContent, document.body);
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const visibleNavigationRects = currentStep.id === 'primary-navigation'
    ? []
    : navigationRects;
  const bottomNavigationTop = visibleNavigationRects
    .filter((rect) => rect.top > viewportHeight * 0.7)
    .reduce((top, rect) => Math.min(top, rect.top), viewportHeight);
  const layoutViewportHeight = currentStep.id === 'primary-navigation'
    ? viewportHeight
    : Math.max(320, bottomNavigationTop - 10);
  const fallbackRect = {
    top: viewportHeight / 2 - 40,
    left: viewportWidth / 2 - 120,
    width: 240,
    height: 80,
    bottom: viewportHeight / 2 + 40,
    right: viewportWidth / 2 + 120,
  };
  const layout = calculateTourLayout({
    targetRect: targetRect ?? fallbackRect,
    viewportWidth,
    viewportHeight: layoutViewportHeight,
    panelHeight,
    preferredPlacement: currentStep.placement,
    spotlightPadding: currentStep.spotlightPadding,
  });

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === totalSteps - 1;
  const titleId = `guided-tour-title-${currentStep.id}`;
  const descriptionId = `guided-tour-description-${currentStep.id}`;

  const content = (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[220] overflow-hidden pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Guided Tour"
        aria-describedby={descriptionId}
        data-tour-target-ready={targetRect ? 'true' : 'false'}
      >
        <svg
          className="absolute inset-0 h-full w-full pointer-events-auto cursor-pointer"
          onClick={onNext}
          aria-hidden="true"
        >
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={layout.spotlightLeft}
                  y={layout.spotlightTop}
                  width={layout.spotlightWidth}
                  height={layout.spotlightHeight}
                  rx={currentStep.spotlightRadius ?? 16}
                  ry={currentStep.spotlightRadius ?? 16}
                  fill="black"
                />
              )}
              {visibleNavigationRects.map((navigationRect, index) => (
                <rect
                  key={`${navigationRect.left}-${navigationRect.top}-${index}`}
                  x={Math.max(0, navigationRect.left - 5)}
                  y={Math.max(0, navigationRect.top - 5)}
                  width={navigationRect.width + 10}
                  height={navigationRect.height + 10}
                  rx={navigationRadius(navigationRect)}
                  ry={navigationRadius(navigationRect)}
                  fill="black"
                />
              ))}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.76)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>

        <motion.div
          data-tour-spotlight="true"
          initial={false}
          animate={{
            top: layout.spotlightTop,
            left: layout.spotlightLeft,
            width: layout.spotlightWidth,
            height: layout.spotlightHeight,
            opacity: targetRect ? 1 : 0,
          }}
          transition={{ duration: 0 }}
          className={`pointer-events-none absolute ${
            currentStep.showSpotlightBorder === false
              ? ''
              : 'border-2 border-primary ring-2 ring-primary/20 shadow-[0_0_18px_rgba(var(--color-primary-rgb),0.55)]'
          }`}
          style={{ borderRadius: currentStep.spotlightRadius ?? 16 }}
        />

        {visibleNavigationRects.map((navigationRect, index) => (
          <motion.div
            key={`${navigationRect.left}-${navigationRect.top}-${index}`}
            data-tour-navigation-highlight="true"
            initial={false}
            animate={{
              top: navigationRect.top - 5,
              left: navigationRect.left - 5,
              width: navigationRect.width + 10,
              height: navigationRect.height + 10,
              opacity: 1,
            }}
            transition={{ duration: 0 }}
            className="pointer-events-none fixed bg-primary/10 ring-2 ring-primary/30 shadow-[0_0_16px_rgba(var(--color-primary-rgb),0.5)]"
            style={{ borderRadius: navigationRadius(navigationRect) }}
          />
        ))}

        <motion.div
          ref={panelRef}
          key={currentStep.id}
          initial={{
            opacity: 0,
          }}
          animate={{ opacity: 1, top: layout.panelTop }}
          exit={{
            opacity: 0,
          }}
          transition={{
            opacity: { duration: 0.12, ease: 'easeOut' },
            top: { duration: 0 },
          }}
          data-tour-placement={layout.panelPlacement}
          className="pointer-events-auto fixed left-1/2 max-h-[calc(100vh-1.5rem)] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 overflow-y-auto rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-2xl sm:w-[calc(100%-2.5rem)] sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{currentStep.section}</span>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">{currentStepIndex + 1} of {totalSteps}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-container-high"
            role="progressbar"
            aria-label="Guided tour progress"
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-valuenow={currentStepIndex + 1}
          >
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>

          <div className="mt-3 space-y-1">
            <h2 id={titleId} className="font-headline text-lg font-extrabold text-on-surface">
              {currentStep.title}
            </h2>
            <p id={descriptionId} className="text-xs leading-relaxed text-on-surface-variant">
              {currentStep.description}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onSkip}
              className="min-h-10 rounded-xl px-1 text-xs font-semibold text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Skip tour
            </button>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  type="button"
                  onClick={onPrev}
                  className="flex min-h-10 items-center justify-center gap-1 rounded-xl bg-surface-container-high px-3.5 text-xs font-bold text-on-surface transition-colors hover:bg-surface-container-highest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-[0.98]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              )}
              <button
                type="button"
                data-autofocus="true"
                onClick={onNext}
                className="flex min-h-10 items-center justify-center gap-1 rounded-xl bg-primary px-4 text-xs font-bold text-on-primary shadow-md shadow-primary/20 transition-[filter,transform] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-on-primary/50 active:scale-[0.98]"
              >
                {isLast ? 'Done' : 'Next'}
                {!isLast && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document === 'undefined' ? content : createPortal(content, document.body);
}
