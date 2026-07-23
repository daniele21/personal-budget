import { describe, expect, it } from 'vitest';
import { calculateTourLayout } from '../GuidedTour';

describe('calculateTourLayout', () => {
  it('places the panel below a target near the top of the viewport', () => {
    const layout = calculateTourLayout({
      targetRect: {
        top: 64,
        bottom: 120,
        left: 24,
        right: 366,
        width: 342,
        height: 56,
      },
      viewportWidth: 390,
      viewportHeight: 844,
      panelHeight: 224,
      preferredPlacement: 'bottom',
    });

    expect(layout.panelPlacement).toBe('bottom');
    expect(layout.panelTop).toBeGreaterThan(layout.spotlightTop + layout.spotlightHeight);
  });

  it('places the panel above fixed navigation near the bottom', () => {
    const layout = calculateTourLayout({
      targetRect: {
        top: 770,
        bottom: 844,
        left: 0,
        right: 390,
        width: 390,
        height: 74,
      },
      viewportWidth: 390,
      viewportHeight: 844,
      panelHeight: 224,
      preferredPlacement: 'top',
      spotlightPadding: 4,
    });

    expect(layout.panelPlacement).toBe('top');
    expect(layout.panelTop + 224).toBeLessThanOrEqual(layout.spotlightTop);
  });

  it('windows tall feature regions and keeps all geometry inside the viewport', () => {
    const layout = calculateTourLayout({
      targetRect: {
        top: -280,
        bottom: 920,
        left: 16,
        right: 374,
        width: 358,
        height: 1200,
      },
      viewportWidth: 390,
      viewportHeight: 667,
      panelHeight: 214,
      preferredPlacement: 'auto',
    });

    expect(layout.spotlightHeight).toBeLessThanOrEqual(667 * 0.36);
    expect(layout.spotlightTop).toBeGreaterThanOrEqual(12);
    expect(layout.spotlightTop + layout.spotlightHeight).toBeLessThanOrEqual(655);
    expect(layout.panelTop).toBeGreaterThanOrEqual(12);
    expect(layout.panelTop + 214).toBeLessThanOrEqual(655);
    const panelBottom = layout.panelTop + 214;
    const spotlightBottom = layout.spotlightTop + layout.spotlightHeight;
    expect(
      panelBottom <= layout.spotlightTop || spotlightBottom <= layout.panelTop,
    ).toBe(true);
  });
});
