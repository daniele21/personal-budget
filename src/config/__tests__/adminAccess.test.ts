import { describe, expect, it } from 'vitest';
import {
  ADMIN_EMAILS,
  PRIMARY_ADMIN_EMAIL,
  isAdminEmail,
  normalizeAdminEmail,
} from '../adminAccess';

describe('admin access policy', () => {
  it('recognizes both configured administrators', () => {
    expect(ADMIN_EMAILS).toEqual([
      'danielemoltisanti@gmail.com',
      'staituned.owner@gmail.com',
    ]);
    expect(PRIMARY_ADMIN_EMAIL).toBe('danielemoltisanti@gmail.com');
    expect(isAdminEmail('danielemoltisanti@gmail.com')).toBe(true);
    expect(isAdminEmail('staituned.owner@gmail.com')).toBe(true);
  });

  it('normalizes case and whitespace without broadening access', () => {
    expect(normalizeAdminEmail('  STAITUNED.OWNER@GMAIL.COM ')).toBe(
      'staituned.owner@gmail.com',
    );
    expect(isAdminEmail('  STAITUNED.OWNER@GMAIL.COM ')).toBe(true);
    expect(isAdminEmail('owner@gmail.com')).toBe(false);
    expect(isAdminEmail('')).toBe(false);
  });
});
