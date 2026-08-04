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
  addCategory: vi.fn(),
  confirmCandidate: vi.fn(),
  ignoreCandidate: vi.fn(),
  selectCandidate: vi.fn(),
  toast: vi.fn(),
  duplicateAssessment: {
    relatedCandidates: [] as Array<{
      id: string;
      merchant?: string;
      sourceAppDisplayName: string;
    }>,
    ledgerTransactions: [] as Array<{
      id: string;
      title: string;
      date: string;
    }>,
    hasPossibleDuplicate: false,
  },
}));

vi.mock('../../../context/AppContext', () => ({
  useApp: () => ({
    categories: mocks.categories,
    addCategory: mocks.addCategory,
  }),
}));

vi.mock('../../../state/PaymentDetectionProvider', () => ({
  usePaymentDetection: () => ({
    selectedCandidate: candidate,
    selectedCandidateDuplicateAssessment: mocks.duplicateAssessment,
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
    mocks.duplicateAssessment.relatedCandidates = [];
    mocks.duplicateAssessment.ledgerTransactions = [];
    mocks.duplicateAssessment.hasPossibleDuplicate = false;
  });

  it('reuses the canonical transaction editor and saves edited fields', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CandidateReview />
      </MemoryRouter>,
    );

    expect(screen.getByText('Detected from a notification')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Add transaction' })).toBeInTheDocument();
    expect(screen.getByText(/Aura controlled test source/)).toBeInTheDocument();
    expect(screen.queryByText(/^Confidence/i)).not.toBeInTheDocument();
    expect(screen.getByText(/without notification text, card data/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Expense amount entry' })).toBeInTheDocument();
    expect(screen.getByRole('group', {
      name: 'Transaction type, detected payments are expenses',
    })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', {
      name: 'Category: not selected. Choose category. Required',
    })).toBeInTheDocument();
    expect(screen.getByText(/Aura cannot infer the category/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Edit amount, currently €12.34',
    }));
    for (let index = 0; index < 5; index += 1) {
      await user.click(screen.getByRole('button', { name: 'Backspace' }));
    }
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '8' }));
    await user.click(screen.getByRole('button', { name: 'Decimal point' }));
    await user.click(screen.getByRole('button', { name: '9' }));
    await user.click(screen.getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: 'Confirm Amount' }));

    const title = screen.getByLabelText('Transaction title');
    await user.clear(title);
    await user.type(title, 'Edited shop');
    await user.click(screen.getByRole('button', {
      name: 'Category: not selected. Choose category. Required',
    }));
    expect(screen.getByRole('dialog', { name: 'Category' }).parentElement)
      .toHaveClass('z-[190]');
    await user.click(screen.getByRole('option', { name: 'Dining' }));
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

  it('closes the full-screen editor without accepting the candidate', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CandidateReview />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', {
      name: 'Close detected transaction review',
    }));

    expect(mocks.selectCandidate).toHaveBeenCalledWith(null);
    expect(mocks.confirmCandidate).not.toHaveBeenCalled();
  });

  it('closes a nested editor modal without dismissing the candidate review', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CandidateReview />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', {
      name: 'Edit amount, currently €12.34',
    }));
    expect(screen.getByRole('dialog', { name: 'Enter amount' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Enter amount' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Add transaction' })).toBeInTheDocument();
    expect(mocks.selectCandidate).not.toHaveBeenCalled();
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
    expect(screen.getByText('Select a category.')).toBeInTheDocument();
    expect(mocks.confirmCandidate).not.toHaveBeenCalled();
  });

  it('requires explicit confirmation before creating a possible duplicate', async () => {
    mocks.duplicateAssessment.relatedCandidates = [{
      id: 'ZyXwVuTsRqPoNmLkJiHgFeDc',
      merchant: 'Local shop',
      sourceAppDisplayName: 'PayPal',
    }];
    mocks.duplicateAssessment.hasPossibleDuplicate = true;
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CandidateReview />
      </MemoryRouter>,
    );

    expect(screen.getByText('Possible duplicate')).toBeInTheDocument();
    expect(screen.getByText(/Detected by PayPal/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', {
      name: 'Category: not selected. Choose category. Required',
    }));
    await user.click(screen.getByRole('option', { name: 'Groceries' }));
    await user.click(screen.getByRole('button', { name: 'Save transaction' }));

    expect(screen.getByRole('dialog', {
      name: 'Create a possible duplicate?',
    })).toBeInTheDocument();
    expect(mocks.confirmCandidate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Create anyway' }));

    await vi.waitFor(() => {
      expect(mocks.confirmCandidate).toHaveBeenCalledOnce();
    });
  });
});
