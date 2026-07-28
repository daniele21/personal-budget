import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentCandidateReviewDto } from '../../platform/paymentDetection';

const candidate: PaymentCandidateReviewDto = {
  id: 'AbCdEfGhIjKlMnOpQrStUvWx',
  operationType: 'card_payment',
  amountMinorUnits: 1234,
  currency: 'EUR',
  merchant: 'Local shop',
  occurredAtEpochMillis: new Date(2026, 6, 28, 12).getTime(),
  detectedAtEpochMillis: new Date(2026, 6, 28, 12, 1).getTime(),
  matchTier: 'exact',
  status: 'pending',
  expiresAtEpochMillis: new Date(2026, 7, 11).getTime(),
  sourceApp: {
    id: 'aura-synthetic-source',
    displayName: 'Aura controlled test source',
  },
};

const mocks = vi.hoisted(() => ({
  order: [] as string[],
  listener: null as null | ((candidates: PaymentCandidateReviewDto[]) => void),
  remove: vi.fn(),
  isSupported: vi.fn(),
  getStatus: vi.fn(),
  listSupportedApps: vi.fn(),
  listCandidates: vi.fn(),
  getCandidate: vi.fn(),
  recoverAcceptance: vi.fn(),
  beginAcceptance: vi.fn(),
  completeAcceptance: vi.fn(),
  ignoreCandidate: vi.fn(),
  updateSettings: vi.fn(),
  requestAuraNotificationPermission: vi.fn(),
  openNotificationAccessSettings: vi.fn(),
  deleteAllCandidates: vi.fn(),
}));

vi.mock('../../platform/paymentDetection', () => ({
  paymentDetection: {
    isSupported: mocks.isSupported,
    getStatus: mocks.getStatus,
    listSupportedApps: mocks.listSupportedApps,
    listCandidates: mocks.listCandidates,
    getCandidate: mocks.getCandidate,
    recoverAcceptance: mocks.recoverAcceptance,
    beginAcceptance: mocks.beginAcceptance,
    completeAcceptance: mocks.completeAcceptance,
    ignoreCandidate: mocks.ignoreCandidate,
    updateSettings: mocks.updateSettings,
    requestAuraNotificationPermission: mocks.requestAuraNotificationPermission,
    openNotificationAccessSettings: mocks.openNotificationAccessSettings,
    deleteAllCandidates: mocks.deleteAllCandidates,
  },
  subscribeToPaymentCandidates: vi.fn(async (
    listener: (candidates: PaymentCandidateReviewDto[]) => void,
    _onError: (error: unknown) => void,
    beforeRefresh: () => Promise<void>,
  ) => {
    mocks.listener = listener;
    await beforeRefresh();
    mocks.order.push('list');
    listener([candidate]);
    return { remove: mocks.remove };
  }),
}));

vi.mock('../../platform/appRuntimeService', () => ({
  subscribeAppResumed: () => () => undefined,
}));

import {
  clearPendingPaymentCandidateTarget,
  publishPaymentCandidateTarget,
} from '../../platform/paymentCandidateTarget';
import {
  PaymentDetectionProvider,
  usePaymentDetection,
} from '../PaymentDetectionProvider';

function Probe() {
  const {
    availability,
    candidates,
    selectedCandidate,
    confirmCandidate,
  } = usePaymentDetection();
  const location = useLocation();
  return (
    <div>
      <span>{availability}</span>
      <span>{candidates.length}</span>
      <span>{selectedCandidate?.id ?? 'none'}</span>
      <span>{location.pathname}</span>
      <button
        type="button"
        onClick={() => void confirmCandidate(candidate.id, {
          amount: '12.34',
          title: 'Local shop',
          category: 'Groceries',
          date: '2026-07-28',
          paymentMethod: 'Debit Card',
        })}
      >
        Confirm candidate
      </button>
    </div>
  );
}

function renderProvider(createTransactionVerified = vi.fn().mockResolvedValue(undefined)) {
  render(
    <MemoryRouter>
      <PaymentDetectionProvider
        active
        appDataHydrated
        transactions={[]}
        categories={['Groceries']}
        createTransactionVerified={createTransactionVerified}
      >
        <Probe />
      </PaymentDetectionProvider>
    </MemoryRouter>,
  );
  return createTransactionVerified;
}

describe('PaymentDetectionProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPendingPaymentCandidateTarget();
    mocks.order.length = 0;
    mocks.listener = null;
    mocks.isSupported.mockResolvedValue(true);
    mocks.getStatus.mockResolvedValue({
      supported: true,
      requestedEnabled: true,
      selectedPackages: ['com.staituned.aura.syntheticnotifications'],
      osPermissionGranted: true,
      listenerConnected: true,
      auraNotificationPermissionGranted: true,
    });
    mocks.listSupportedApps.mockResolvedValue({ apps: [] });
    mocks.listCandidates.mockResolvedValue([candidate]);
    mocks.getCandidate.mockResolvedValue(candidate);
    mocks.recoverAcceptance.mockImplementation(async () => {
      mocks.order.push('recover');
      return {
        completedCandidateIds: [],
        returnedToPendingCandidateIds: [],
      };
    });
    mocks.beginAcceptance.mockResolvedValue({
      candidate,
      acceptanceToken: 'A'.repeat(43),
      reservedTransactionId: '123e4567-e89b-42d3-a456-426614174000',
    });
    mocks.completeAcceptance.mockResolvedValue(undefined);
  });

  it('runs acceptance recovery before exposing the cold-start queue', async () => {
    renderProvider();

    expect(await screen.findByText('ready')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(mocks.order).toEqual(['recover', 'list']);
  });

  it('persists the reserved canonical transaction before completing native acceptance', async () => {
    const createTransactionVerified = renderProvider();
    const user = userEvent.setup();
    await screen.findByText('ready');

    await user.click(screen.getByRole('button', { name: 'Confirm candidate' }));

    await vi.waitFor(() => {
      expect(createTransactionVerified).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '123e4567-e89b-42d3-a456-426614174000',
          amount: 12.34,
          title: 'Local shop',
        }),
      );
      expect(mocks.completeAcceptance).toHaveBeenCalledWith({
        candidateId: candidate.id,
        acceptanceToken: 'A'.repeat(43),
        edited: false,
      });
    });
    expect(createTransactionVerified.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.completeAcceptance.mock.invocationCallOrder[0]);
  });

  it('consumes a notification deep link and opens the candidate review route', async () => {
    renderProvider();
    await screen.findByText('ready');
    const acknowledge = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      publishPaymentCandidateTarget(candidate.id, acknowledge);
    });

    expect(await screen.findByText(candidate.id)).toBeInTheDocument();
    expect(screen.getByText('/payment-detection')).toBeInTheDocument();
    expect(acknowledge).toHaveBeenCalledOnce();
  });
});
