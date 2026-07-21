import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ReportsPage } from '../ReportsPage';

const setReportsAnalyticsLens = vi.fn();

vi.mock('../../state/PreferencesProvider', () => ({
  usePreferences: () => ({ reportsAnalyticsLens: 'actual', setReportsAnalyticsLens }),
}));
vi.mock('../InsightsPage', () => ({ InsightsPage: () => <div>Overview content</div> }));
vi.mock('../ComparePage', () => ({ ComparePage: () => <div>Compare content</div> }));
vi.mock('../YearReviewPage', () => ({ YearReviewPage: () => <div>Year content</div> }));

describe('ReportsPage view options', () => {
  it('keeps the active lens visible and reveals the full lens control in a bottom sheet', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ReportsPage view="overview" /></MemoryRouter>);

    const trigger = screen.getByRole('button', { name: /View options, All spending/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'View options' })).not.toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByRole('dialog', { name: 'View options' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Net of extras' }));
    expect(setReportsAnalyticsLens).toHaveBeenCalledWith('normalized');
  });
});
