import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from '@capacitor/core';
import { subscribeAppResumed } from './appRuntimeService';

export interface NativePaymentDetectionSettings {
  requestedEnabled: boolean;
  selectedPackages: string[];
}

export interface NativeNotificationAccessStatus {
  osPermissionGranted: boolean;
  listenerConnected: boolean;
  auraNotificationPermissionGranted: boolean;
}

export interface NativePaymentDetectionStatus
  extends NativePaymentDetectionSettings,
    NativeNotificationAccessStatus {
  supported: boolean;
}

export interface NativeSupportedPaymentApp {
  id: string;
  packageName: string;
  displayName: string;
  syntheticOnly: boolean;
  installed: boolean;
}

export interface PaymentCandidateReviewDto {
  id: string;
  operationType: 'card_payment';
  amountMinorUnits: number;
  currency: 'EUR';
  merchant?: string;
  occurredAtEpochMillis: number;
  detectedAtEpochMillis: number;
  matchTier: 'exact' | 'review';
  status: 'pending' | 'accepting';
  expiresAtEpochMillis: number;
  sourceApp: {
    id: string;
    displayName: string;
  };
}

export interface PaymentCandidateAcceptance {
  candidate: PaymentCandidateReviewDto;
  acceptanceToken: string;
  reservedTransactionId: string;
}

export interface PaymentAcceptanceRecovery {
  completedCandidateIds: string[];
  returnedToPendingCandidateIds: string[];
}

export interface PaymentCandidateChangedEvent {
  reason: 'created' | 'updated' | 'ignored' | 'deleted';
  candidateId?: string;
}

interface NativePaymentDetectionPlugin {
  isSupported(): Promise<{ supported: boolean }>;
  getNotificationAccessStatus(): Promise<NativeNotificationAccessStatus>;
  getSettings(): Promise<NativePaymentDetectionSettings>;
  getStatus(): Promise<NativePaymentDetectionStatus>;
  listSupportedApps(): Promise<{ apps: NativeSupportedPaymentApp[] }>;
  updateSettings(options: NativePaymentDetectionSettings): Promise<NativePaymentDetectionStatus>;
  openNotificationAccessSettings(): Promise<void>;
  requestAuraNotificationPermission(): Promise<{ granted: boolean }>;
  listCandidates(): Promise<{ candidates: unknown[] }>;
  getCandidate(options: { candidateId: string }): Promise<unknown>;
  ignoreCandidate(options: { candidateId: string }): Promise<void>;
  beginAcceptance(options: { candidateId: string }): Promise<unknown>;
  completeAcceptance(options: {
    candidateId: string;
    acceptanceToken: string;
    edited: boolean;
  }): Promise<void>;
  recoverAcceptance(options: {
    persistedTransactionIds: string[];
  }): Promise<PaymentAcceptanceRecovery>;
  deleteAllCandidates(): Promise<{ deletedCount: number }>;
  addListener(
    eventName: 'candidateChanged',
    listener: (event: PaymentCandidateChangedEvent) => void,
  ): Promise<PluginListenerHandle>;
}

const NativePaymentDetection =
  registerPlugin<NativePaymentDetectionPlugin>('PaymentDetection');
const CANDIDATE_ID_PATTERN = /^[A-Za-z0-9_-]{24}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const TRANSACTION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pluginAvailable(): boolean {
  return (
    Capacitor.getPlatform() === 'android' &&
    Capacitor.isPluginAvailable('PaymentDetection')
  );
}

function requireAndroidPlugin(): NativePaymentDetectionPlugin {
  if (!pluginAvailable()) {
    throw new Error('Payment detection is available only on Android.');
  }
  return NativePaymentDetection;
}

export function nativeRecoveryTransactionIds(
  transactionIds: string[],
): string[] {
  return Array.from(
    new Set(
      transactionIds
        .filter((transactionId) => TRANSACTION_ID_PATTERN.test(transactionId))
        .map((transactionId) => transactionId.toLowerCase()),
    ),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string, maxLength: number): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maxLength
  ) {
    throw new Error(`Invalid native payment candidate field: ${field}.`);
  }
  return value;
}

function requireSafeInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new Error(`Invalid native payment candidate field: ${field}.`);
  }
  return value as number;
}

export function parsePaymentCandidateDto(
  value: unknown,
): PaymentCandidateReviewDto {
  if (!isRecord(value)) throw new Error('Invalid native payment candidate.');
  const id = requireString(value.id, 'id', 24);
  if (!CANDIDATE_ID_PATTERN.test(id)) {
    throw new Error('Invalid native payment candidate field: id.');
  }
  const sourceApp = value.sourceApp;
  if (!isRecord(sourceApp)) {
    throw new Error('Invalid native payment candidate field: sourceApp.');
  }
  const operationType = requireString(value.operationType, 'operationType', 32);
  const currency = requireString(value.currency, 'currency', 3);
  const matchTier = requireString(value.matchTier, 'matchTier', 8);
  const status = requireString(value.status, 'status', 12);
  if (
    operationType !== 'card_payment' ||
    currency !== 'EUR' ||
    (matchTier !== 'exact' && matchTier !== 'review') ||
    (status !== 'pending' && status !== 'accepting')
  ) {
    throw new Error('Invalid native payment candidate contract.');
  }
  const merchant =
    value.merchant === undefined
      ? undefined
      : requireString(value.merchant, 'merchant', 120);

  return {
    id,
    operationType,
    amountMinorUnits: requireSafeInteger(
      value.amountMinorUnits,
      'amountMinorUnits',
    ),
    currency,
    ...(merchant ? { merchant } : {}),
    occurredAtEpochMillis: requireSafeInteger(
      value.occurredAtEpochMillis,
      'occurredAtEpochMillis',
    ),
    detectedAtEpochMillis: requireSafeInteger(
      value.detectedAtEpochMillis,
      'detectedAtEpochMillis',
    ),
    matchTier,
    status,
    expiresAtEpochMillis: requireSafeInteger(
      value.expiresAtEpochMillis,
      'expiresAtEpochMillis',
    ),
    sourceApp: {
      id: requireString(sourceApp.id, 'sourceApp.id', 128),
      displayName: requireString(
        sourceApp.displayName,
        'sourceApp.displayName',
        120,
      ),
    },
  };
}

function parseAcceptance(value: unknown): PaymentCandidateAcceptance {
  if (!isRecord(value)) throw new Error('Invalid native acceptance response.');
  const acceptanceToken = requireString(
    value.acceptanceToken,
    'acceptanceToken',
    43,
  );
  const reservedTransactionId = requireString(
    value.reservedTransactionId,
    'reservedTransactionId',
    36,
  );
  if (
    !TOKEN_PATTERN.test(acceptanceToken) ||
    !TRANSACTION_ID_PATTERN.test(reservedTransactionId)
  ) {
    throw new Error('Invalid native acceptance response.');
  }
  return {
    candidate: parsePaymentCandidateDto(value.candidate),
    acceptanceToken,
    reservedTransactionId,
  };
}

export const paymentDetection = {
  async isSupported(): Promise<boolean> {
    if (!pluginAvailable()) return false;
    return (await NativePaymentDetection.isSupported()).supported === true;
  },

  async getNotificationAccessStatus(): Promise<NativeNotificationAccessStatus> {
    return await requireAndroidPlugin().getNotificationAccessStatus();
  },

  async getSettings(): Promise<NativePaymentDetectionSettings> {
    return await requireAndroidPlugin().getSettings();
  },

  async getStatus(): Promise<NativePaymentDetectionStatus> {
    return await requireAndroidPlugin().getStatus();
  },

  async listSupportedApps(): Promise<{ apps: NativeSupportedPaymentApp[] }> {
    return await requireAndroidPlugin().listSupportedApps();
  },

  async updateSettings(
    options: NativePaymentDetectionSettings,
  ): Promise<NativePaymentDetectionStatus> {
    return await requireAndroidPlugin().updateSettings(options);
  },

  async openNotificationAccessSettings(): Promise<void> {
    await requireAndroidPlugin().openNotificationAccessSettings();
  },

  async requestAuraNotificationPermission(): Promise<{ granted: boolean }> {
    return await requireAndroidPlugin().requestAuraNotificationPermission();
  },

  async listCandidates(): Promise<PaymentCandidateReviewDto[]> {
    const response = await requireAndroidPlugin().listCandidates();
    if (!Array.isArray(response.candidates)) {
      throw new Error('Invalid native payment candidate list.');
    }
    return response.candidates.map(parsePaymentCandidateDto);
  },

  async getCandidate(candidateId: string): Promise<PaymentCandidateReviewDto> {
    return parsePaymentCandidateDto(
      await requireAndroidPlugin().getCandidate({ candidateId }),
    );
  },

  async ignoreCandidate(candidateId: string): Promise<void> {
    await requireAndroidPlugin().ignoreCandidate({ candidateId });
  },

  async beginAcceptance(
    candidateId: string,
  ): Promise<PaymentCandidateAcceptance> {
    return parseAcceptance(
      await requireAndroidPlugin().beginAcceptance({ candidateId }),
    );
  },

  async completeAcceptance(options: {
    candidateId: string;
    acceptanceToken: string;
    edited: boolean;
  }): Promise<void> {
    await requireAndroidPlugin().completeAcceptance(options);
  },

  async recoverAcceptance(
    persistedTransactionIds: string[],
  ): Promise<PaymentAcceptanceRecovery> {
    return await requireAndroidPlugin().recoverAcceptance({
      // Only native-reserved transaction IDs can complete an acceptance.
      // Aura also supports historical/imported IDs with other formats, which
      // must not cross the stricter Android bridge contract.
      persistedTransactionIds: nativeRecoveryTransactionIds(
        persistedTransactionIds,
      ),
    });
  },

  async deleteAllCandidates(): Promise<{ deletedCount: number }> {
    return await requireAndroidPlugin().deleteAllCandidates();
  },

  async addCandidateChangedListener(
    listener: (event: PaymentCandidateChangedEvent) => void,
  ): Promise<PluginListenerHandle> {
    return await requireAndroidPlugin().addListener('candidateChanged', listener);
  },
};

export interface PaymentCandidateSubscription {
  remove(): Promise<void>;
}

export async function subscribeToPaymentCandidates(
  listener: (candidates: PaymentCandidateReviewDto[]) => void,
  onError: (error: unknown) => void = () => undefined,
  beforeRefresh: () => Promise<void> = async () => undefined,
): Promise<PaymentCandidateSubscription> {
  let active = true;
  let refreshSequence = 0;
  const refresh = async () => {
    const sequence = ++refreshSequence;
    try {
      await beforeRefresh();
      const candidates = await paymentDetection.listCandidates();
      if (active && sequence === refreshSequence) listener(candidates);
    } catch (error) {
      if (active && sequence === refreshSequence) onError(error);
    }
  };
  const candidateHandle =
    await paymentDetection.addCandidateChangedListener(() => void refresh());
  const removeResume = subscribeAppResumed(() => void refresh());
  await refresh();

  return {
    remove: async () => {
      active = false;
      removeResume();
      await candidateHandle.remove();
    },
  };
}
