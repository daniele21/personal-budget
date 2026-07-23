import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { STORAGE_KEYS } from '../data/storageKeys';
import { TOUR_STEPS, TourStep } from '../config/tourSteps';

const ROUTE_HANDOFF_MS = 520;

interface UseGuidedTourReturn {
  isActive: boolean;
  isTransitioning: boolean;
  transitionDestination: string | null;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
  targetRect: DOMRect | null;
  navigationRects: DOMRect[];
  transitionRect: DOMRect | null;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
}

export function wasTourCompleted(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(STORAGE_KEYS.guidedTourComplete) === 'true';
}

export function useGuidedTour(): UseGuidedTourReturn {
  const [isActive, setIsActive] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDestination, setTransitionDestination] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [navigationRects, setNavigationRects] = useState<DOMRect[]>([]);
  const [transitionRect, setTransitionRect] = useState<DOMRect | null>(null);
  const targetElementRef = useRef<Element | null>(null);
  const transitionStartedAtRef = useRef<number | null>(null);
  const transitionRectRef = useRef<DOMRect | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const totalSteps = TOUR_STEPS.length;
  const currentStep = isActive && TOUR_STEPS[currentStepIndex] ? TOUR_STEPS[currentStepIndex] : null;

  // Finish and persist completion
  const completeTour = useCallback(() => {
    setIsActive(false);
    setIsTransitioning(false);
    setTransitionDestination(null);
    transitionStartedAtRef.current = null;
    setCurrentStepIndex(0);
    setTargetRect(null);
    setNavigationRects([]);
    setTransitionRect(null);
    transitionRectRef.current = null;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.guidedTourComplete, 'true');
    }
  }, []);

  // Skip
  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  // Start tour manually or automatically
  const startTour = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEYS.guidedTourComplete);
    }
    setCurrentStepIndex(0);
    setIsActive(true);
    if (TOUR_STEPS[0] && location.pathname !== TOUR_STEPS[0].route) {
      setIsTransitioning(true);
      setTransitionDestination(TOUR_STEPS[0].section);
      transitionStartedAtRef.current = window.performance.now();
      transitionRectRef.current = null;
      setTransitionRect(null);
      navigate(TOUR_STEPS[0].route);
    } else {
      setIsTransitioning(false);
      setTransitionDestination(null);
      transitionStartedAtRef.current = null;
    }
  }, [location.pathname, navigate]);

  // Go to next step
  const nextStep = useCallback(() => {
    if (currentStepIndex >= totalSteps - 1) {
      completeTour();
      return;
    }
    const nextIndex = currentStepIndex + 1;
    const nextStepConfig = TOUR_STEPS[nextIndex];
    setCurrentStepIndex(nextIndex);
    if (nextStepConfig && location.pathname !== nextStepConfig.route) {
      setIsTransitioning(true);
      setTransitionDestination(nextStepConfig.section);
      transitionStartedAtRef.current = window.performance.now();
      transitionRectRef.current = null;
      setTransitionRect(null);
      navigate(nextStepConfig.route);
    }
  }, [completeTour, currentStepIndex, location.pathname, navigate, totalSteps]);

  // Go to previous step
  const prevStep = useCallback(() => {
    if (currentStepIndex <= 0) return;
    const prevIndex = currentStepIndex - 1;
    const prevStepConfig = TOUR_STEPS[prevIndex];
    setCurrentStepIndex(prevIndex);
    if (prevStepConfig && location.pathname !== prevStepConfig.route) {
      setIsTransitioning(true);
      setTransitionDestination(prevStepConfig.section);
      transitionStartedAtRef.current = window.performance.now();
      transitionRectRef.current = null;
      setTransitionRect(null);
      navigate(prevStepConfig.route);
    }
  }, [currentStepIndex, location.pathname, navigate]);

  // Reveal the current feature, then keep the spotlight attached while the
  // route renders and the smooth scroll is still moving.
  useEffect(() => {
    if (!isActive || !currentStep) {
      targetElementRef.current = null;
      setTargetRect(null);
      setNavigationRects([]);
      setTransitionRect(null);
      transitionRectRef.current = null;
      return;
    }

    let disposed = false;
    let findTimer: number | undefined;
    let measureFrame: number | undefined;
    let trackingFrame: number | undefined;
    let transitionTimer: number | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let attempts = 0;

    targetElementRef.current = null;
    setTargetRect(null);
    setNavigationRects([]);

    const measureNavigation = () => {
      if (disposed) return;
      const primarySelectors = [
        'nav[aria-label="Main navigation"] [aria-current="page"]',
        '[data-tour-id="topbar-more"][aria-current="page"]',
      ];
      const primaryElements = primarySelectors
        .map((selector) => document.querySelector(selector))
        .filter((element): element is Element => Boolean(element))
        .map((element) => (
          element.getAttribute('aria-label') === 'Add transaction'
            ? element.querySelector(':scope > span') ?? element
            : element
        ));
      setNavigationRects(primaryElements.map((element) => element.getBoundingClientRect()));

      if (transitionStartedAtRef.current !== null && transitionRectRef.current === null) {
        const sectionElement = document.querySelector(
          'nav[aria-label="Report views"] [aria-current="page"], '
          + 'nav[aria-label="Planning views"] [aria-current="page"]',
        );
        const destinationElement = sectionElement ?? primaryElements[0];
        if (destinationElement) {
          const rect = destinationElement.getBoundingClientRect();
          if (rect.bottom > 56 && rect.top < window.innerHeight) {
            transitionRectRef.current = rect;
            setTransitionRect(rect);
          }
        }
      }
    };

    const measureTarget = () => {
      if (disposed || !targetElementRef.current) return;
      setTargetRect(targetElementRef.current.getBoundingClientRect());
      measureNavigation();
    };

    const scheduleMeasure = () => {
      if (measureFrame !== undefined) return;
      measureFrame = window.requestAnimationFrame(() => {
        measureFrame = undefined;
        measureTarget();
      });
    };

    const isInsideFixedSurface = (element: Element) => {
      let current: Element | null = element;
      while (current) {
        if (window.getComputedStyle(current).position === 'fixed') return true;
        current = current.parentElement;
      }
      return false;
    };

    const trackScrollAnimation = (startedAt: number) => {
      measureTarget();
      if (!disposed && window.performance.now() - startedAt < 900) {
        trackingFrame = window.requestAnimationFrame(() => trackScrollAnimation(startedAt));
      }
    };

    const findAndRevealTarget = () => {
      if (disposed) return;

      const element = document.querySelector(currentStep.target);
      if (!element) {
        attempts += 1;
        if (attempts < 60) {
          findTimer = window.setTimeout(findAndRevealTarget, 50);
        }
        return;
      }

      targetElementRef.current = element;
      measureTarget();

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!isInsideFixedSurface(element)) {
        element.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }

      resizeObserver = new ResizeObserver(scheduleMeasure);
      resizeObserver.observe(element);
      trackScrollAnimation(window.performance.now());

      if (
        transitionStartedAtRef.current !== null
        && location.pathname === currentStep.route
      ) {
        const elapsed = window.performance.now() - transitionStartedAtRef.current;
        const remaining = Math.max(0, ROUTE_HANDOFF_MS - elapsed);
        transitionTimer = window.setTimeout(() => {
          transitionStartedAtRef.current = null;
          setIsTransitioning(false);
          setTransitionDestination(null);
          setTransitionRect(null);
          transitionRectRef.current = null;
        }, remaining);
      }
    };

    // Lazy routes and page transitions need a short opportunity to mount.
    findTimer = window.setTimeout(findAndRevealTarget, 80);
    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('scroll', scheduleMeasure, true);

    return () => {
      disposed = true;
      targetElementRef.current = null;
      if (findTimer !== undefined) window.clearTimeout(findTimer);
      if (measureFrame !== undefined) window.cancelAnimationFrame(measureFrame);
      if (trackingFrame !== undefined) window.cancelAnimationFrame(trackingFrame);
      if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('scroll', scheduleMeasure, true);
    };
  }, [currentStep, isActive, location.pathname]);

  return {
    isActive,
    isTransitioning,
    transitionDestination,
    currentStepIndex,
    currentStep,
    totalSteps,
    targetRect,
    navigationRects,
    transitionRect,
    startTour,
    nextStep,
    prevStep,
    skipTour,
  };
}
