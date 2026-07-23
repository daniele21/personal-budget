export type ViteAuthCommand = 'build' | 'serve';

export const PRODUCTION_AUTH_RUNTIME = 'src/hooks/useFirebaseAuth.ts';
export const E2E_AUTH_RUNTIME = 'src/e2e/useE2EAuth.ts';

/**
 * Selects the authentication adapter at bundle-resolution time.
 *
 * The E2E adapter is restricted to the Vite development server so an
 * authentication-bypassing deployable bundle cannot be produced by mistake.
 */
export function resolveAuthRuntime(mode: string, command: ViteAuthCommand): string {
  if (mode !== 'e2e') return PRODUCTION_AUTH_RUNTIME;

  if (command !== 'serve') {
    throw new Error('E2E authentication is local-serve only; an E2E build is forbidden.');
  }

  return E2E_AUTH_RUNTIME;
}
