import { beforeEach, describe, expect, it, vi } from 'vitest';

const nativePlugin = vi.hoisted(() => ({
  isSupported: vi.fn(),
  getNotificationAccessStatus: vi.fn(),
  getSettings: vi.fn(),
  getStatus: vi.fn(),
  listSupportedApps: vi.fn(),
  updateSettings: vi.fn(),
  openNotificationAccessSettings: vi.fn(),
  requestAuraNotificationPermission: vi.fn(),
  listCandidates: vi.fn(),
  getCandidate: vi.fn(),
  ignoreCandidate: vi.fn(),
  beginAcceptance: vi.fn(),
  completeAcceptance: vi.fn(),
  recoverAcceptance: vi.fn(),
  deleteAllCandidates: vi.fn(),
  addListener: vi.fn(),
}));
const capacitor = vi.hoisted(() => ({
  getPlatform: vi.fn(() => 'android'),
  isPluginAvailable: vi.fn(() => true),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: capacitor,
  registerPlugin: () => nativePlugin,
}));

import {
  nativeRecoveryTransactionIds,
  parsePaymentCandidateDto,
  paymentDetection,
} from '../paymentDetection';

const candidate = {
  id: 'AbCdEfGhIjKlMnOpQrStUvWx',
  operationType: 'card_payment',
  amountMinorUnits: 1234,
  currency: 'EUR',
  merchant: 'Negozio di prova',
  occurredAtEpochMillis: 1_754_000_000_000,
  detectedAtEpochMillis: 1_754_000_000_100,
  matchTier: 'exact',
  status: 'pending',
  expiresAtEpochMillis: 1_755_209_600_100,
  sourceApp: {
    id: 'aura-synthetic-source',
    displayName: 'Aura controlled test source',
  },
  title: 'raw title must not cross the typed boundary',
  text: 'raw text must not cross the typed boundary',
  technicalFingerprint: 'hidden',
};

describe('payment detection native contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capacitor.getPlatform.mockReturnValue('android');
    capacitor.isPluginAvailable.mockReturnValue(true);
  });

  it('returns a minimized, validated candidate DTO', () => {
    const parsed = parsePaymentCandidateDto(candidate);

    expect(parsed).toEqual({
      id: candidate.id,
      operationType: 'card_payment',
      amountMinorUnits: 1234,
      currency: 'EUR',
      merchant: 'Negozio di prova',
      occurredAtEpochMillis: candidate.occurredAtEpochMillis,
      detectedAtEpochMillis: candidate.detectedAtEpochMillis,
      matchTier: 'exact',
      status: 'pending',
      expiresAtEpochMillis: candidate.expiresAtEpochMillis,
      sourceApp: candidate.sourceApp,
    });
    expect(parsed).not.toHaveProperty('title');
    expect(parsed).not.toHaveProperty('text');
    expect(parsed).not.toHaveProperty('technicalFingerprint');
  });

  it('rejects malformed IDs, unsafe amounts, and unsupported contracts', () => {
    expect(() => parsePaymentCandidateDto({ ...candidate, id: 'short' }))
      .toThrow('field: id');
    expect(() =>
      parsePaymentCandidateDto({
        ...candidate,
        amountMinorUnits: Number.MAX_SAFE_INTEGER + 1,
      }),
    ).toThrow('amountMinorUnits');
    expect(() =>
      parsePaymentCandidateDto({ ...candidate, currency: 'USD' }),
    ).toThrow('contract');
  });

  it('keeps support false outside the installed Android plugin', async () => {
    capacitor.getPlatform.mockReturnValue('web');

    await expect(paymentDetection.isSupported()).resolves.toBe(false);
    await expect(paymentDetection.listCandidates()).rejects.toThrow(
      'available only on Android',
    );
  });

  it('validates begin-acceptance token and reserved transaction ID', async () => {
    nativePlugin.beginAcceptance.mockResolvedValue({
      candidate,
      acceptanceToken: 'A'.repeat(43),
      reservedTransactionId: '123e4567-e89b-42d3-a456-426614174000',
    });

    const result = await paymentDetection.beginAcceptance(candidate.id);

    expect(result.candidate.id).toBe(candidate.id);
    expect(result.acceptanceToken).toHaveLength(43);
    expect(nativePlugin.beginAcceptance).toHaveBeenCalledWith({
      candidateId: candidate.id,
    });
  });

  it('keeps legacy and imported transaction IDs outside acceptance recovery', async () => {
    nativePlugin.recoverAcceptance.mockResolvedValue({
      completedCandidateIds: [],
      returnedToPendingCandidateIds: [],
    });

    expect(nativeRecoveryTransactionIds([
      'legacy_1722012345',
      '123E4567-E89B-42D3-A456-426614174000',
      'import_1722012345_0',
      '123e4567-e89b-42d3-a456-426614174000',
    ])).toEqual([
      '123e4567-e89b-42d3-a456-426614174000',
    ]);

    await paymentDetection.recoverAcceptance([
      'legacy_1722012345',
      '123E4567-E89B-42D3-A456-426614174000',
      'import_1722012345_0',
    ]);

    expect(nativePlugin.recoverAcceptance).toHaveBeenCalledWith({
      persistedTransactionIds: [
        '123e4567-e89b-42d3-a456-426614174000',
      ],
    });
  });
});
