import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PreferencesProvider, usePreferences } from '../PreferencesProvider';

function LensProbe() {
  const {
    analyticsLens,
    setAnalyticsLens,
    reportsAnalyticsLens,
    setReportsAnalyticsLens,
  } = usePreferences();

  return (
    <div>
      <span>Lens: {analyticsLens}</span>
      <span>Reports lens: {reportsAnalyticsLens}</span>
      <button type="button" onClick={() => setAnalyticsLens('normalized')}>Use net</button>
      <button type="button" onClick={() => setReportsAnalyticsLens('extras')}>Use extras</button>
    </div>
  );
}

const storedValues = new Map<string, string>();

beforeEach(() => {
  storedValues.clear();
  const storage = {
    getItem: (key: string) => storedValues.get(key) ?? null,
    setItem: (key: string, value: string) => storedValues.set(key, value),
    removeItem: (key: string) => storedValues.delete(key),
    clear: () => storedValues.clear(),
    key: (index: number) => Array.from(storedValues.keys())[index] ?? null,
    get length() { return storedValues.size; },
  };
  vi.stubGlobal('localStorage', storage);
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PreferencesProvider analytics lens', () => {
  it('shares the lens during the provider session without persisting it', async () => {
    const user = userEvent.setup();
    const firstRender = render(
      <PreferencesProvider>
        <LensProbe />
      </PreferencesProvider>,
    );

    expect(screen.getByText('Lens: actual')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Use net' }));
    await user.click(screen.getByRole('button', { name: 'Use extras' }));
    expect(screen.getByText('Lens: normalized')).toBeInTheDocument();
    expect(screen.getByText('Reports lens: extras')).toBeInTheDocument();
    expect(storedValues.has('analyticsLens')).toBe(false);

    firstRender.unmount();
    render(
      <PreferencesProvider>
        <LensProbe />
      </PreferencesProvider>,
    );

    expect(screen.getByText('Lens: actual')).toBeInTheDocument();
    expect(screen.getByText('Reports lens: actual')).toBeInTheDocument();
  });
});
