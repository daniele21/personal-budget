import { describe, expect, it } from 'vitest';
import { E2E_TEST_USER, useFirebaseAuth } from '../useE2EAuth';
import {
  E2E_AUTH_RUNTIME,
  PRODUCTION_AUTH_RUNTIME,
  resolveAuthRuntime,
} from '../../../vite.auth-runtime';

describe('E2E authentication runtime', () => {
  it('provides a stable, authenticated, non-admin synthetic identity', async () => {
    const first = useFirebaseAuth();
    const second = useFirebaseAuth();

    expect(first).toBe(second);
    expect(first).toMatchObject({
      user: E2E_TEST_USER,
      loading: false,
      error: null,
      isAdmin: false,
    });
    expect(first.user?.email.endsWith('.invalid')).toBe(true);

    await expect(first.signInWithGoogle()).resolves.toBeUndefined();
    await expect(first.signOut()).resolves.toBeUndefined();
    expect(useFirebaseAuth().user).toBe(E2E_TEST_USER);
  });

  it('uses Firebase for every normal mode', () => {
    expect(resolveAuthRuntime('development', 'serve')).toBe(PRODUCTION_AUTH_RUNTIME);
    expect(resolveAuthRuntime('test', 'serve')).toBe(PRODUCTION_AUTH_RUNTIME);
    expect(resolveAuthRuntime('production', 'build')).toBe(PRODUCTION_AUTH_RUNTIME);
  });

  it('allows bypass only in local E2E serve mode', () => {
    expect(resolveAuthRuntime('e2e', 'serve')).toBe(E2E_AUTH_RUNTIME);
    expect(() => resolveAuthRuntime('e2e', 'build')).toThrow(/build is forbidden/i);
  });
});
