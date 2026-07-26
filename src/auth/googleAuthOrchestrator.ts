import type { AppRuntimePlatform } from '../platform/platformCapabilities';

export interface GoogleAuthOrchestratorDependencies {
  webPopupSignIn: () => Promise<void>;
  nativeCredentialSignIn: (serverClientId: string) => Promise<string>;
  firebaseIdTokenSignIn: (idToken: string) => Promise<void>;
}

export async function signInWithGoogleForPlatform(
  platform: AppRuntimePlatform,
  webClientId: string | undefined,
  dependencies: GoogleAuthOrchestratorDependencies,
): Promise<void> {
  if (platform !== 'android') {
    await dependencies.webPopupSignIn();
    return;
  }

  const serverClientId = webClientId?.trim();
  if (!serverClientId) {
    throw new Error('Google authentication is not configured for Android.');
  }

  const idToken = await dependencies.nativeCredentialSignIn(serverClientId);
  if (!idToken.trim()) {
    throw new Error('Google authentication returned an empty credential.');
  }

  await dependencies.firebaseIdTokenSignIn(idToken);
}
