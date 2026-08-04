import type { AuthRuntimeState } from '../auth/AuthRuntime';
import type { User } from '../types';

/** Synthetic identity for local browser automation. Never use real user data. */
export const E2E_TEST_USER: Readonly<User> = Object.freeze({
  id: 'e2e-local-user-v1',
  name: 'Aura E2E Test User',
  email: 'e2e-user@aura.invalid',
  photoUrl: '',
});

async function noOp(): Promise<void> {
  // Authentication is intentionally stable for the duration of an E2E run.
}

const E2E_AUTH_STATE: AuthRuntimeState = Object.freeze({
  user: E2E_TEST_USER,
  loading: false,
  error: null,
  isAdmin: false,
  signInWithGoogle: noOp,
  signOut: noOp,
  reauthenticateForAccountDeletion: noOp,
  deleteAuthIdentity: noOp,
});

/**
 * Test-only implementation selected by Vite's local `e2e` serve mode.
 * It deliberately has no Firebase import and no privileged/admin identity.
 */
export function useFirebaseAuth(): AuthRuntimeState {
  return E2E_AUTH_STATE;
}
