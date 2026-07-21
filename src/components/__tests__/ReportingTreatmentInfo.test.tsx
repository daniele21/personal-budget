import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ReportingTreatmentInfo } from '../ReportingTreatmentInfo';

describe('ReportingTreatmentInfo', () => {
  it('explains the reporting and budget effects of Extra and Refund', async () => {
    const user = userEvent.setup();
    render(<ReportingTreatmentInfo />);

    await user.click(screen.getByRole('button', { name: 'Explain Extra and Refund' }));

    const dialog = screen.getByRole('dialog', { name: 'Extra and Refund' });
    expect(dialog).toBeInTheDocument();
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(screen.getByText(/included in Actual and Extras only/)).toBeInTheDocument();
    expect(screen.getByText(/reduces reported expenses and the matching category spend/)).toBeInTheDocument();
    expect(screen.getByText(/Recurring-generated transactions always remain regular/)).toBeInTheDocument();
  });
});
