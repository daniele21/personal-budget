/**
 * Firebase initialization.
 * Config values come from environment variables (set in .env).
 * Authentication + Firestore (for access-control allowlist).
 */
import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firestoreDatabaseId = import.meta.env.VITE_FIRESTORE_DATABASE_ID || 'budget-db';
const androidCiFirebaseEmulators =
  import.meta.env.MODE === 'android-debug'
  && import.meta.env.VITE_AURA_ANDROID_CI_FIREBASE_EMULATORS === 'true';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

if (androidCiFirebaseEmulators) {
  connectAuthEmulator(auth, 'http://10.0.2.2:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '10.0.2.2', 8080);

  const email = import.meta.env.VITE_AURA_ANDROID_CI_AUTH_EMAIL?.trim();
  const password = import.meta.env.VITE_AURA_ANDROID_CI_AUTH_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error('Android CI Firebase emulator authentication is not configured.');
  }

  void signInWithEmailAndPassword(auth, email, password).catch(() => {
    console.error('[Auth] Isolated Android CI Firebase sign-in failed.');
  });
}
