import { describe, expect, it } from 'vitest';
import {
  createGoogleAuthDiagnostic,
  formatGoogleAuthDiagnostic,
} from '../authDiagnostics';

describe('createGoogleAuthDiagnostic', () => {
  it('preserves safe native and Firebase error codes', () => {
    expect(
      createGoogleAuthDiagnostic('credential_manager', {
        code: 'AUTH_NO_CREDENTIAL',
        name: 'CapacitorException',
      }),
    ).toEqual({
      stage: 'credential_manager',
      code: 'AUTH_NO_CREDENTIAL',
      errorType: 'CapacitorException',
    });

    expect(
      createGoogleAuthDiagnostic('firebase_exchange', {
        code: 'auth/invalid-credential',
        name: 'FirebaseError',
      }),
    ).toEqual({
      stage: 'firebase_exchange',
      code: 'auth/invalid-credential',
      errorType: 'FirebaseError',
    });
  });

  it('does not copy messages or untrusted properties into diagnostics', () => {
    const diagnostic = createGoogleAuthDiagnostic('credential_manager', {
      code: 'secret-token user@example.com',
      name: 'Invalid type with spaces',
      message: 'secret-token user@example.com',
      credential: 'sensitive-credential',
    });

    expect(diagnostic).toEqual({
      stage: 'credential_manager',
      code: 'AUTH_UNCLASSIFIED',
      errorType: 'UnknownError',
    });
    expect(JSON.stringify(diagnostic)).not.toContain('secret-token');
    expect(JSON.stringify(diagnostic)).not.toContain('user@example.com');
    expect(JSON.stringify(diagnostic)).not.toContain('sensitive-credential');
  });

  it('handles primitive failures without exposing their value', () => {
    expect(
      createGoogleAuthDiagnostic(
        'android_configuration',
        'VITE_FIREBASE_WEB_CLIENT_ID=secret',
      ),
    ).toEqual({
      stage: 'android_configuration',
      code: 'AUTH_UNCLASSIFIED',
      errorType: 'UnknownError',
    });
  });

  it('formats diagnostics as a Logcat-readable bounded string', () => {
    const formatted = formatGoogleAuthDiagnostic({
      stage: 'firebase_exchange',
      code: 'auth/invalid-credential',
      errorType: 'FirebaseError',
    });

    expect(formatted).toBe(
      'stage=firebase_exchange code=auth/invalid-credential ' +
        'errorType=FirebaseError',
    );
  });
});
