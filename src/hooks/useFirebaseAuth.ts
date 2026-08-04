/**
 * useFirebaseAuth — manages Firebase Authentication state.
 *
 * Listens to `onAuthStateChanged` and maps Firebase User → app User type.
 * Provides signInWithGoogle and signOut actions.
 * Returns loading state for the initial auth check.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut as firebaseSignOut,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { isEmailAllowed, isAdmin } from '../lib/allowedUsers';
import { PRIMARY_ADMIN_EMAIL } from '../config/adminAccess';
import {
  createGoogleAuthDiagnostic,
  formatGoogleAuthDiagnostic,
  type GoogleAuthStage,
} from '../auth/authDiagnostics';
import { signInWithGoogleForPlatform } from '../auth/googleAuthOrchestrator';
import type { AuthRuntimeState } from '../auth/AuthRuntime';
import { getPlatformCapabilities } from '../platform/platformCapabilities';
import { NativeGoogleAuth } from '../platform/nativeGoogleAuth';
import {
  purgeNativePaymentData,
  registerNativePaymentOwner,
} from '../platform/nativeDataLifecycle';
import type { User } from '../types';

function mapFirebaseUser(fbUser: FirebaseUser): User {
  return {
    id: fbUser.uid,
    name: fbUser.displayName || 'User',
    email: fbUser.email || '',
    photoUrl: fbUser.photoURL || '',
  };
}

export function useFirebaseAuth(): AuthRuntimeState {
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
            setError(
              `Your account does not have access. Contact ${PRIMARY_ADMIN_EMAIL} to request it.`,
            );
            setLoading(false);
            return;
          }
          try {
            await registerNativePaymentOwner(fbUser.uid);
          } catch {
            await firebaseSignOut(auth);
            setUser(null);
            setAdminFlag(false);
            setError('Unable to prepare secure Android storage.');
            setLoading(false);
            return;
          }
          setUser(mapFirebaseUser(fbUser));
          setAdminFlag(isAdmin(email));
        } catch {
          // If Firestore is unreachable, allow admin through, use cache for others
          if (isAdmin(email)) {
            try {
              await registerNativePaymentOwner(fbUser.uid);
            } catch {
              await firebaseSignOut(auth);
              setUser(null);
              setAdminFlag(false);
              setError('Unable to prepare secure Android storage.');
              setLoading(false);
              return;
            }
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
    let diagnosticStage: GoogleAuthStage = 'runtime_detection';
    try {
      const { platform } = getPlatformCapabilities();
      diagnosticStage =
        platform === 'android' ? 'android_configuration' : 'web_popup';
      await signInWithGoogleForPlatform(
        platform,
        {
          webPopupSignIn: async () => {
            diagnosticStage = 'web_popup';
            await signInWithPopup(auth, googleProvider);
          },
          nativeCredentialSignIn: async () => {
            diagnosticStage = 'credential_manager';
            const result = await NativeGoogleAuth.signIn();
            return result.idToken;
          },
          firebaseIdTokenSignIn: async (idToken) => {
            diagnosticStage = 'firebase_exchange';
            const credential = GoogleAuthProvider.credential(idToken);
            await signInWithCredential(auth, credential);
          },
        },
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      setError(message);
      console.error(
        '[Auth] Google sign-in failed ' +
          formatGoogleAuthDiagnostic(
            createGoogleAuthDiagnostic(diagnosticStage, err),
          ),
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await purgeNativePaymentData('logout');
      await firebaseSignOut(auth);
      if (getPlatformCapabilities().platform === 'android') {
        await NativeGoogleAuth.signOut().catch(() => undefined);
      }
      setUser(null);
      setAdminFlag(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-out failed';
      setError(message);
      console.error(
        '[Auth] Sign-out failed ' +
          formatGoogleAuthDiagnostic(
            createGoogleAuthDiagnostic('sign_out', err),
          ),
      );
    }
  }, []);

  const reauthenticateForAccountDeletion = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('No authenticated account is available.');

    if (getPlatformCapabilities().platform === 'android') {
      const result = await NativeGoogleAuth.signIn();
      if (!result.idToken.trim()) throw new Error('Google reauthentication returned an empty credential.');
      await reauthenticateWithCredential(
        currentUser,
        GoogleAuthProvider.credential(result.idToken),
      );
      return;
    }

    await reauthenticateWithPopup(currentUser, googleProvider);
  }, []);

  const deleteAuthIdentity = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('No authenticated account is available.');
    await deleteUser(currentUser);
    if (getPlatformCapabilities().platform === 'android') {
      await NativeGoogleAuth.signOut().catch(() => undefined);
    }
    setUser(null);
    setAdminFlag(false);
  }, []);

  return {
    user,
    loading,
    error,
    isAdmin: adminFlag,
    signInWithGoogle,
    signOut,
    reauthenticateForAccountDeletion,
    deleteAuthIdentity,
  };
}
