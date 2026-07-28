import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CandidateReview } from '../CandidateReview';

const candidate = {
  id: 'AbCdEfGhIjKlMnOpQrStUvWx',
  operationType: 'card_payment' as const,
  amountMinorUnits: 1234,
  currency: 'EUR' as const,
  merchant: 'Local shop',
  occurredAtEpochMillis: new Date(2026, 6, 28, 12).getTime(),
  detectedAtEpochMillis: new Date(2026, 6, 28, 12, 1).getTime(),
  matchTier: 'exact' as const,
  status: 'pending' as const,
  expiresAtEpochMillis: new Date(2026, 7, 11).getTime(),
  sourceApp: {
    id: 'aura-synthetic-source',
    displayName: 'Aura controlled test source',
  },
};

const mocks = vi.hoisted(() => ({
  categories: ['Groceries', 'Dining'],
  confirmCandidate: vi.fn(),
  ignoreCandidate: vi.fn(),
  selectCandidate: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../../../context/AppContext', () => ({
  useApp: () => ({ categories: mocks.categories }),
}));

vi.mock('../../../state/PaymentDetectionProvider', () => ({
  usePaymentDetection: () => ({
    selectedCandidate: candidate,
    busyCandidateId: null,
    selectCandidate: mocks.selectCandidate,
    confirmCandidate: mocks.confirmCandidate,
    ignoreCandidate: mocks.ignoreCandidate,
  }),
}));

vi.mock('../../Toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

describe('CandidateReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirmCandidate.mockResolvedValue({
      id: '123e4567-e89b-42d3-a456-426614174000',
    });
  });

  it('shows minimized detection context and saves edited canonical fields', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CandidateReview />
      </MemoryRouter>,
    );

    expect(screen.getByText('Detected from a notification')).toBeInTheDocument();
    expect(screen.getByText(/Aura controlled test source/)).toBeInTheDocument();
    expect(screen.queryByText(/^Confidence/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/card number/i)).toBeInTheDocument();

    const amount = screen.getByLabelText('Amount');
    await user.clear(amount);
    await user.type(amount, '18.95');
    const title = screen.getByLabelText('Transaction title');
    await user.clear(title);
    await user.type(title, 'Edited shop');
    await user.selectOptions(screen.getByLabelText('Category'), 'Dining');
    await user.selectOptions(screen.getByLabelText('Payment method'), 'Credit Card');
    await user.click(screen.getByRole('button', { name: 'Mark as extra' }));
    await user.click(screen.getByRole('button', { name: 'Save transaction' }));

    expect(mocks.confirmCandidate).toHaveBeenCalledWith(candidate.id, {
      amount: '18.95',
      title: 'Edited shop',
      category: 'Dining',
      date: '2026-07-28',
      paymentMethod: 'Credit Card',
      reportingClass: 'extra',
    });
  });

  it('keeps the review open and reports validation errors for invalid values', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CandidateReview />
      </MemoryRouter>,
    );

    const title = screen.getByLabelText('Transaction title');
    await user.clear(title);
    await user.click(screen.getByRole('button', { name: 'Save transaction' }));

    expect(await screen.findByText('Enter a title for this transaction.')).toBeInTheDocument();
    expect(mocks.confirmCandidate).not.toHaveBeenCalled();
  });
});
