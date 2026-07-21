import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsLensControl } from '../AnalyticsLensControl';

describe('AnalyticsLensControl', () => {
  it('exposes the active compact lens and reports changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<AnalyticsLensControl value="actual" onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Actual, includes extras' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Net of extras' }));
    expect(onChange).toHaveBeenCalledWith('normalized');
  });

  it('provides all three report lenses in full mode', () => {
    render(<AnalyticsLensControl value="extras" onChange={vi.fn()} mode="full" />);

    expect(screen.getByRole('button', { name: 'Actual, includes extras' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Net of extras' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Extras only' })).toHaveAttribute('aria-pressed', 'true');
  });
});
