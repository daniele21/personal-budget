import { registerPlugin } from '@capacitor/core';

export interface NativeGoogleAuthSignInResult {
  idToken: string;
}

export interface NativeGoogleAuthPlugin {
  signIn(): Promise<NativeGoogleAuthSignInResult>;
  signOut(): Promise<void>;
}

export const NativeGoogleAuth = registerPlugin<NativeGoogleAuthPlugin>(
  'NativeGoogleAuth',
);
