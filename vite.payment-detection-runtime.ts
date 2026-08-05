import type { ViteAuthCommand } from './vite.auth-runtime';

export const PRODUCTION_PAYMENT_DETECTION_RUNTIME =
  'src/runtime/paymentDetectionRuntime.ts';
export const E2E_PAYMENT_DETECTION_RUNTIME =
  'src/e2e/paymentDetectionRuntime.ts';

export function resolvePaymentDetectionRuntime(
  mode: string,
  command: ViteAuthCommand,
): string {
  if (mode !== 'e2e') return PRODUCTION_PAYMENT_DETECTION_RUNTIME;
  if (command !== 'serve') {
    throw new Error(
      'E2E payment detection is local-serve only; an E2E build is forbidden.',
    );
  }
  return E2E_PAYMENT_DETECTION_RUNTIME;
}
