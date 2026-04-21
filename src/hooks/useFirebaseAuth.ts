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
import { isEmailAllowed, isAdmin } from '../lib/allowedUsers';
import { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
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
  const [adminFlag, setAdminFlag] = useState(false);

  // Listen to auth state changes (persists across page reloads)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const email = fbUser.email || '';
        try {
          const allowed = await isEmailAllowed(email);
          if (!allowed) {
            await firebaseSignOut(auth);
            setUser(null);
            setAdminFlag(false);
            setError('Access denied. Your account is not authorized.');
            setLoading(false);
            return;
          }
          setUser(mapFirebaseUser(fbUser));
          setAdminFlag(isAdmin(email));
        } catch {
          // If Firestore is unreachable, allow admin through, use cache for others
          if (isAdmin(email)) {
            setUser(mapFirebaseUser(fbUser));
            setAdminFlag(true);
          } else {
            // isEmailAllowed already falls back to cache internally,
            // so if we get here it means even the cache check failed
            await firebaseSignOut(auth);
            setUser(null);
            setAdminFlag(false);
            setError('Unable to verify access. Please try again later.');
          }
        }
      } else {
        setUser(null);
        setAdminFlag(false);
      }
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

  return { user, loading, error, isAdmin: adminFlag, signInWithGoogle, signOut };
}
