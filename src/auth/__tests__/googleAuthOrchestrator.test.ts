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

    await signInWithGoogleForPlatform('web', undefined, dependencies);

    expect(dependencies.webPopupSignIn).toHaveBeenCalledOnce();
    expect(dependencies.nativeCredentialSignIn).not.toHaveBeenCalled();
    expect(dependencies.firebaseIdTokenSignIn).not.toHaveBeenCalled();
  });

  it('exchanges the in-memory Android ID token with Firebase', async () => {
    const dependencies = createDependencies();

    await signInWithGoogleForPlatform(
      'android',
      '  web-client-id  ',
      dependencies,
    );

    expect(dependencies.webPopupSignIn).not.toHaveBeenCalled();
    expect(dependencies.nativeCredentialSignIn)
      .toHaveBeenCalledWith('web-client-id');
    expect(dependencies.firebaseIdTokenSignIn)
      .toHaveBeenCalledWith('native-id-token');
  });

  it('fails before opening native auth when the client ID is absent', async () => {
    const dependencies = createDependencies();

    await expect(
      signInWithGoogleForPlatform('android', ' ', dependencies),
    ).rejects.toThrow(/not configured/i);

    expect(dependencies.nativeCredentialSignIn).not.toHaveBeenCalled();
    expect(dependencies.firebaseIdTokenSignIn).not.toHaveBeenCalled();
  });

  it('rejects an empty native credential before Firebase exchange', async () => {
    const dependencies = createDependencies();
    dependencies.nativeCredentialSignIn.mockResolvedValueOnce(' ');

    await expect(
      signInWithGoogleForPlatform(
        'android',
        'web-client-id',
        dependencies,
      ),
    ).rejects.toThrow(/empty credential/i);

    expect(dependencies.firebaseIdTokenSignIn).not.toHaveBeenCalled();
  });
});
