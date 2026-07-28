import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  candidateListener: null as null | (() => void),
  resumeListener: null as null | (() => void),
  removeCandidateListener: vi.fn(),
  listCandidates: vi.fn(),
}));

const nativePlugin = vi.hoisted(() => ({
  listCandidates: mocks.listCandidates,
  addListener: vi.fn(async (
    _eventName: string,
    listener: () => void,
  ) => {
    mocks.candidateListener = listener;
    return { remove: mocks.removeCandidateListener };
  }),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'android',
    isPluginAvailable: () => true,
  },
  registerPlugin: () => nativePlugin,
}));

vi.mock('../appRuntimeService', () => ({
  subscribeAppResumed: (listener: () => void) => {
    mocks.resumeListener = listener;
    return () => {
      mocks.resumeListener = null;
    };
  },
}));

import { subscribeToPaymentCandidates } from '../paymentDetection';

const candidate = {
  id: 'AbCdEfGhIjKlMnOpQrStUvWx',
  operationType: 'card_payment',
  amountMinorUnits: 1234,
  currency: 'EUR',
  occurredAtEpochMillis: 1_754_000_000_000,
  detectedAtEpochMillis: 1_754_000_000_100,
  matchTier: 'exact',
  status: 'pending',
  expiresAtEpochMillis: 1_755_209_600_100,
  sourceApp: {
    id: 'aura-synthetic-source',
    displayName: 'Aura controlled test source',
  },
};

describe('payment candidate refresh orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.candidateListener = null;
    mocks.resumeListener = null;
    mocks.listCandidates.mockResolvedValue({ candidates: [candidate] });
  });

  it('uses full refresh on cold start, resume, and live-event hints', async () => {
    const listener = vi.fn();
    const subscription = await subscribeToPaymentCandidates(listener);

    expect(mocks.listCandidates).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: candidate.id }),
    ]);

    mocks.candidateListener?.();
    await vi.waitFor(() => {
      expect(mocks.listCandidates).toHaveBeenCalledTimes(2);
    });

    mocks.resumeListener?.();
    await vi.waitFor(() => {
      expect(mocks.listCandidates).toHaveBeenCalledTimes(3);
    });

    await subscription.remove();
    expect(mocks.removeCandidateListener).toHaveBeenCalledOnce();
  });
});
