import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acknowledgePaymentCandidateTarget,
  clearPendingPaymentCandidateTarget,
  getPendingPaymentCandidateTarget,
  publishPaymentCandidateTarget,
  subscribePaymentCandidateTarget,
} from '../paymentCandidateTarget';

describe('payment candidate deep-link target', () => {
  beforeEach(clearPendingPaymentCandidateTarget);

  it('retains the opaque target until the M8 review owner consumes it', () => {
    const acknowledge = vi.fn().mockResolvedValue(undefined);
    publishPaymentCandidateTarget(
      'AbCdEfGhIjKlMnOpQrStUvWx',
      acknowledge,
    );
    const listener = vi.fn();

    const unsubscribe = subscribePaymentCandidateTarget(listener);

    expect(getPendingPaymentCandidateTarget()).toEqual({
      candidateId: 'AbCdEfGhIjKlMnOpQrStUvWx',
    });
    expect(listener).toHaveBeenCalledWith({
      candidateId: 'AbCdEfGhIjKlMnOpQrStUvWx',
    });
    expect(acknowledge).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('clears native pending state only after the review owner acknowledges it', async () => {
    const acknowledge = vi.fn().mockResolvedValue(undefined);
    publishPaymentCandidateTarget(
      'AbCdEfGhIjKlMnOpQrStUvWx',
      acknowledge,
    );

    await acknowledgePaymentCandidateTarget();

    expect(getPendingPaymentCandidateTarget()).toBeNull();
    expect(acknowledge).toHaveBeenCalledOnce();
  });
});
