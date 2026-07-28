import { describe, expect, it } from 'vitest';
import {
  parseAuraAppTarget,
  parseAuraAppUrl,
} from '../appRuntimeService';

describe('Aura Android app URLs', () => {
  it('accepts only allowlisted routes for production and debug schemes', () => {
    expect(
      parseAuraAppUrl('com.staituned.aura://open/reports'),
    ).toBe('/reports');
    expect(
      parseAuraAppUrl('com.staituned.aura.debug://open/data'),
    ).toBe('/data');
  });

  it('rejects unknown hosts, schemes, routes, and malformed input', () => {
    expect(
      parseAuraAppUrl('com.staituned.aura://other/reports'),
    ).toBeNull();
    expect(parseAuraAppUrl('https://open/reports')).toBeNull();
    expect(
      parseAuraAppUrl('com.staituned.aura://open/edit/transaction-id'),
    ).toBeNull();
    expect(parseAuraAppUrl('not a url')).toBeNull();
  });

  it('rejects query or fragment data at the navigation boundary', () => {
    expect(
      parseAuraAppUrl(
        'com.staituned.aura://open/transactions?amount=10#merchant',
      ),
    ).toBeNull();
  });

  it('accepts only opaque candidate IDs without financial URL data', () => {
    expect(
      parseAuraAppTarget(
        'com.staituned.aura.debug://open/payment-candidates/AbCdEfGhIjKlMnOpQrStUvWx',
      ),
    ).toEqual({
      kind: 'paymentCandidate',
      candidateId: 'AbCdEfGhIjKlMnOpQrStUvWx',
    });
    expect(
      parseAuraAppTarget(
        'com.staituned.aura://open/payment-candidates/short',
      ),
    ).toBeNull();
    expect(
      parseAuraAppTarget(
        'com.staituned.aura://open/payment-candidates/AbCdEfGhIjKlMnOpQrStUvWx?amount=10',
      ),
    ).toBeNull();
  });
});
