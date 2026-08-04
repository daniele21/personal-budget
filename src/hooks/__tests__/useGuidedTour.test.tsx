import React from 'react';
import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useGuidedTour, wasTourCompleted } from '../useGuidedTour';
import { TOUR_STEPS } from '../../config/tourSteps';

describe('TOUR_STEPS config', () => {
  it('contains the complete guided journey with valid English copy', () => {
    expect(TOUR_STEPS.length).toBeGreaterThan(0);
    expect(TOUR_STEPS.length).toBeLessThanOrEqual(4);
    expect(new Set(TOUR_STEPS.map((step) => step.id)).size).toBe(TOUR_STEPS.length);
    TOUR_STEPS.forEach((step) => {
      expect(step.id).toBeTruthy();
      expect(step.target).toBeTruthy();
      expect(step.route).toBeTruthy();
      expect(step.section).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.description).toBeTruthy();
      // Verify English language
      expect(step.title).not.toMatch(/spesa|entrata|scopri|primo/i);
    });
  });
});

describe('useGuidedTour', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const localStorageMock: Storage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => { store.set(key, value); },
      removeItem: (key) => { store.delete(key); },
      clear: () => { store.clear(); },
      length: store.size,
      key: (i) => Array.from(store.keys())[i] ?? null,
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
  );

  const morePageWrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={['/more']}>{children}</MemoryRouter>
  );

  it('starts inactive and detects completed status', () => {
    const { result } = renderHook(() => useGuidedTour(), { wrapper });
    expect(result.current.isActive).toBe(false);
    expect(wasTourCompleted()).toBe(false);
  });

  it('navigates through steps and records dismissal separately from completion', () => {
    const { result } = renderHook(() => useGuidedTour(), { wrapper });

    act(() => {
      result.current.startTour();
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.currentStepIndex).toBe(0);
    expect(result.current.currentStep?.id).toBe('home-period');

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStepIndex).toBe(1);
    expect(result.current.currentStep?.id).toBe('safe-to-spend');

    act(() => {
      result.current.prevStep();
    });

    expect(result.current.currentStepIndex).toBe(0);

    act(() => {
      result.current.skipTour();
    });

    expect(result.current.isActive).toBe(false);
    expect(wasTourCompleted()).toBe(false);
    expect(store.get('aura_tour_state_v1:home')).toBe('dismissed');
  });

  it('announces the destination when starting from another page', () => {
    const { result } = renderHook(() => useGuidedTour(), { wrapper: morePageWrapper });

    act(() => {
      result.current.startTour();
    });

    expect(result.current.isTransitioning).toBe(true);
    expect(result.current.transitionDestination).toBe('Home');
  });
});
