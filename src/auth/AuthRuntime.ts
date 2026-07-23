import type { User } from '../types';

/**
 * Contract consumed by AuthProvider, independently from the authentication
 * mechanism selected by the Vite build mode.
 */
export interface AuthRuntimeState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}
