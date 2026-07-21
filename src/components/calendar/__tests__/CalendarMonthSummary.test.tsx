import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarMonthSummary } from '../CalendarMonthSummary';

describe('CalendarMonthSummary', () => {
  it('presents recurring payments as the single focal planning summary', () => {
    render(
      <CalendarMonthSummary
        total={1543.5}
        count={6}
        nextPayment={{ name: 'Rent', amount: 900, date: new Date(Date.now() + 10 * 86_400_000) }}
        period="current"
      />,
    );

    expect(screen.getByText('Remaining this month').closest('.aura-card-inverse')).toBeInTheDocument();
    expect(screen.getByText('€1,543.50')).toBeInTheDocument();
    expect(screen.getByText('6 recurring payments')).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
  });

  it('uses scheduled language for historical months', () => {
    render(<CalendarMonthSummary total={500} count={1} period="past" />);
    expect(screen.getByText('Scheduled in this month')).toBeInTheDocument();
    expect(screen.getByText('1 recurring payment')).toBeInTheDocument();
  });

  it('uses scheduled language for future months', () => {
    render(<CalendarMonthSummary total={500} count={1} period="future" />);
    expect(screen.getByText('Scheduled for this month')).toBeInTheDocument();
  });
});
