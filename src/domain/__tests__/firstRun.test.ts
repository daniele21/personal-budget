import { describe, expect, it } from 'vitest';
import { deriveFirstRunState } from '../firstRun';

const base = {
  isLoggedIn: true,
  isHydrated: true,
  backupCheckComplete: true,
  localDataEmpty: true,
  initialDataChoice: null,
  onboardingComplete: false,
} as const;

describe('deriveFirstRunState', () => {
  it('does not expose first-run UI before authentication and hydration', () => {
    expect(deriveFirstRunState({ ...base, isLoggedIn: false })).toBe('signed-out');
    expect(deriveFirstRunState({ ...base, isHydrated: false })).toBe('bootstrapping');
  });

  it('checks backup before offering a destructive start choice', () => {
    expect(deriveFirstRunState({ ...base, backupCheckComplete: false })).toBe('checking-backup');
    expect(deriveFirstRunState(base)).toBe('choose-start');
  });

  it('requires essential setup for a blank workspace', () => {
    expect(deriveFirstRunState({ ...base, initialDataChoice: 'blank' })).toBe('essential-setup');
    expect(deriveFirstRunState({
      ...base,
      initialDataChoice: 'blank',
      backupCheckComplete: false,
    })).toBe('essential-setup');
  });

  it('is ready after setup, restore, demo, or when financial data already exists', () => {
    expect(deriveFirstRunState({ ...base, initialDataChoice: 'blank', onboardingComplete: true })).toBe('ready');
    expect(deriveFirstRunState({ ...base, initialDataChoice: 'restored' })).toBe('ready');
    expect(deriveFirstRunState({ ...base, initialDataChoice: 'demo' })).toBe('ready');
    expect(deriveFirstRunState({ ...base, localDataEmpty: false })).toBe('ready');
  });
});
