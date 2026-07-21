import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getRangeDates, PeriodSelector } from '../PeriodSelector';

describe('PeriodSelector', () => {
  it('blocks an inverted custom range before applying it', async () => {
    const user = userEvent.setup();
    const onCustomDatesChange = vi.fn();

    render(
      <PeriodSelector
        range="1M"
        lens="actual"
        customStartDate="2026-07-01"
        customEndDate="2026-07-21"
        periodLabel="1 Jul – 21 Jul"
        onRangeChange={vi.fn()}
        onLensChange={vi.fn()}
        onCustomDatesChange={onCustomDatesChange}
      />,
    );

    await user.selectOptions(screen.getByRole('combobox', { name: /select period/i }), 'CUSTOM');
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-07-22' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-07-21' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Start date must be on or before end date.');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    expect(onCustomDatesChange).not.toHaveBeenCalled();
  });

  it('normalizes inverted custom dates as a defensive domain fallback', () => {
    const range = getRangeDates('CUSTOM', 2026, 6, '2026-07-22', '2026-07-21');

    expect(range.start.getDate()).toBe(21);
    expect(range.end.getDate()).toBe(22);
    expect(range.start.getTime()).toBeLessThan(range.end.getTime());
  });
});
