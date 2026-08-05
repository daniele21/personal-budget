import { describe, expect, it } from 'vitest';
import {
  E2E_PAYMENT_DETECTION_RUNTIME,
  PRODUCTION_PAYMENT_DETECTION_RUNTIME,
  resolvePaymentDetectionRuntime,
} from '../../../vite.payment-detection-runtime';

describe('payment detection runtime selection', () => {
  it('uses the native runtime outside local E2E serve mode', () => {
    expect(resolvePaymentDetectionRuntime('development', 'serve'))
      .toBe(PRODUCTION_PAYMENT_DETECTION_RUNTIME);
    expect(resolvePaymentDetectionRuntime('production', 'build'))
      .toBe(PRODUCTION_PAYMENT_DETECTION_RUNTIME);
  });

  it('allows synthetic candidates only in local E2E serve mode', () => {
    expect(resolvePaymentDetectionRuntime('e2e', 'serve'))
      .toBe(E2E_PAYMENT_DETECTION_RUNTIME);
    expect(() => resolvePaymentDetectionRuntime('e2e', 'build'))
      .toThrow(/build is forbidden/i);
  });
});
