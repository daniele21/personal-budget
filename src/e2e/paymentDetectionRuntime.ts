import type {
  NativePaymentDetectionSettings,
  NativePaymentDetectionStatus,
  NativeSupportedPaymentApp,
  PaymentAcceptanceRecovery,
  PaymentCandidateAcceptance,
  PaymentCandidateReviewDto,
  PaymentCandidateSubscription,
} from '../platform/paymentDetection';

const occurredAt = new Date('2026-08-05T08:30:00.000Z').getTime();
const expiresAt = new Date('2026-08-19T08:30:00.000Z').getTime();

let candidates: PaymentCandidateReviewDto[] = [
  candidate('Intesa Sanpaolo Mobile', 'intesa-sanpaolo-mobile', 'Casa Arredo', 1_200_00, 0),
  candidate('Google Wallet', 'google-wallet', 'Supermercato Verde', 67_40, 1),
  candidate('PayPal', 'paypal', 'Stream Plus', 12_99, 2),
];

const apps: NativeSupportedPaymentApp[] = [
  app('intesa-sanpaolo-mobile', 'com.latuabancaperandroid', 'Intesa Sanpaolo Mobile'),
  app('google-wallet', 'com.google.android.apps.walletnfcrel', 'Google Wallet'),
  app('paypal', 'com.paypal.android.p2pmobile', 'PayPal'),
];

let status: NativePaymentDetectionStatus = {
  supported: true,
  requestedEnabled: true,
  selectedPackages: apps.map((item) => item.packageName),
  osPermissionGranted: true,
  listenerConnected: true,
  auraNotificationPermissionGranted: true,
};

function candidate(
  displayName: string,
  id: string,
  merchant: string,
  amountMinorUnits: number,
  offset: number,
): PaymentCandidateReviewDto {
  return {
    id: `${String(offset + 1).repeat(24)}`,
    operationType: 'card_payment',
    amountMinorUnits,
    currency: 'EUR',
    merchant,
    occurredAtEpochMillis: occurredAt - offset * 3_600_000,
    detectedAtEpochMillis: occurredAt - offset * 3_600_000 + 1_000,
    matchTier: 'exact',
    status: 'pending',
    expiresAtEpochMillis: expiresAt,
    sourceApp: { id, displayName },
  };
}

function app(id: string, packageName: string, displayName: string): NativeSupportedPaymentApp {
  return { id, packageName, displayName, syntheticOnly: false, installed: true };
}

export const paymentDetection = {
  async isSupported(): Promise<boolean> {
    return true;
  },
  async getStatus(): Promise<NativePaymentDetectionStatus> {
    return status;
  },
  async listSupportedApps(): Promise<{ apps: NativeSupportedPaymentApp[] }> {
    return { apps };
  },
  async listCandidates(): Promise<PaymentCandidateReviewDto[]> {
    return candidates;
  },
  async getCandidate(candidateId: string): Promise<PaymentCandidateReviewDto> {
    const found = candidates.find((item) => item.id === candidateId);
    if (!found) throw new Error('Synthetic candidate not found.');
    return found;
  },
  async recoverAcceptance(): Promise<PaymentAcceptanceRecovery> {
    return { completedCandidateIds: [], returnedToPendingCandidateIds: [] };
  },
  async beginAcceptance(candidateId: string): Promise<PaymentCandidateAcceptance> {
    return {
      candidate: await this.getCandidate(candidateId),
      acceptanceToken: 'A'.repeat(43),
      reservedTransactionId: '123e4567-e89b-42d3-a456-426614174000',
    };
  },
  async completeAcceptance(): Promise<void> {},
  async ignoreCandidate(candidateId: string): Promise<void> {
    candidates = candidates.filter((item) => item.id !== candidateId);
  },
  async updateSettings(next: NativePaymentDetectionSettings): Promise<NativePaymentDetectionStatus> {
    status = { ...status, ...next };
    return status;
  },
  async requestAuraNotificationPermission(): Promise<{ granted: boolean }> {
    return { granted: true };
  },
  async openNotificationAccessSettings(): Promise<void> {},
  async deleteAllCandidates(): Promise<{ deletedCount: number }> {
    const deletedCount = candidates.length;
    candidates = [];
    return { deletedCount };
  },
};

export async function subscribeToPaymentCandidates(
  listener: (items: PaymentCandidateReviewDto[]) => void,
  onError: (error: unknown) => void = () => undefined,
  beforeRefresh: () => Promise<void> = async () => undefined,
): Promise<PaymentCandidateSubscription> {
  try {
    await beforeRefresh();
    listener(await paymentDetection.listCandidates());
  } catch (error) {
    onError(error);
  }
  return { remove: async () => undefined };
}
