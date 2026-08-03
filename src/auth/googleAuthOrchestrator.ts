import type { AppRuntimePlatform } from '../platform/platformCapabilities';

export interface GoogleAuthOrchestratorDependencies {
  webPopupSignIn: () => Promise<void>;
  nativeCredentialSignIn: () => Promise<string>;
  firebaseIdTokenSignIn: (idToken: string) => Promise<void>;
}

export async function signInWithGoogleForPlatform(
  platform: AppRuntimePlatform,
  dependencies: GoogleAuthOrchestratorDependencies,
): Promise<void> {
  if (platform !== 'android') {
    await dependencies.webPopupSignIn();
    return;
  }

  const idToken = await dependencies.nativeCredentialSignIn();
  if (!idToken.trim()) {
    throw new Error('Google authentication returned an empty credential.');
  }

  await dependencies.firebaseIdTokenSignIn(idToken);
}
