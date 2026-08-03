import { describe, expect, it, vi } from 'vitest';
import { signInWithGoogleForPlatform } from '../googleAuthOrchestrator';

function createDependencies() {
  return {
    webPopupSignIn: vi.fn(async () => undefined),
    nativeCredentialSignIn: vi.fn(async () => 'native-id-token'),
    firebaseIdTokenSignIn: vi.fn(async () => undefined),
  };
}

describe('signInWithGoogleForPlatform', () => {
  it('keeps popup authentication on the web', async () => {
    const dependencies = createDependencies();

    await signInWithGoogleForPlatform('web', dependencies);

    expect(dependencies.webPopupSignIn).toHaveBeenCalledOnce();
    expect(dependencies.nativeCredentialSignIn).not.toHaveBeenCalled();
    expect(dependencies.firebaseIdTokenSignIn).not.toHaveBeenCalled();
  });

  it('exchanges the in-memory Android ID token with Firebase', async () => {
    const dependencies = createDependencies();

    await signInWithGoogleForPlatform('android', dependencies);

    expect(dependencies.webPopupSignIn).not.toHaveBeenCalled();
    expect(dependencies.nativeCredentialSignIn).toHaveBeenCalledOnce();
    expect(dependencies.firebaseIdTokenSignIn)
      .toHaveBeenCalledWith('native-id-token');
  });

  it('delegates Android client configuration to the native plugin', async () => {
    const dependencies = createDependencies();

    await signInWithGoogleForPlatform('android', dependencies);

    expect(dependencies.nativeCredentialSignIn).toHaveBeenCalledOnce();
    expect(dependencies.firebaseIdTokenSignIn)
      .toHaveBeenCalledWith('native-id-token');
  });

  it('rejects an empty native credential before Firebase exchange', async () => {
    const dependencies = createDependencies();
    dependencies.nativeCredentialSignIn.mockResolvedValueOnce(' ');

    await expect(
      signInWithGoogleForPlatform('android', dependencies),
    ).rejects.toThrow(/empty credential/i);

    expect(dependencies.firebaseIdTokenSignIn).not.toHaveBeenCalled();
  });
});
