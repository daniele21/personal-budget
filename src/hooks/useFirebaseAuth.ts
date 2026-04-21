/**
 * useFirebaseAuth — manages Firebase Authentication state.
 *
 * Listens to `onAuthStateChanged` and maps Firebase User → app User type.
 * Provides signInWithGoogle and signOut actions.
 * Returns loading state for the initial auth check.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

function mapFirebaseUser(fbUser: FirebaseUser): User {
  return {
    id: fbUser.uid,
    name: fbUser.displayName || 'User',
    email: fbUser.email || '',
    photoUrl: fbUser.photoURL || '',
  };
}

export function useFirebaseAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to auth state changes (persists across page reloads)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser ? mapFirebaseUser(fbUser) : null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      setError(message);
      console.error('[Auth] Google sign-in failed:', message);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-out failed';
      setError(message);
      console.error('[Auth] Sign-out failed:', message);
    }
  }, []);

  return { user, loading, error, signInWithGoogle, signOut };
}
