export type GoogleAuthStage =
  | 'runtime_detection'
  | 'web_popup'
  | 'android_configuration'
  | 'credential_manager'
  | 'firebase_exchange'
  | 'sign_out';

export interface GoogleAuthDiagnostic {
  stage: GoogleAuthStage;
  code: string;
  errorType: string;
}

const SAFE_ERROR_CODE = /^(?:AUTH_[A-Z0-9_]+|auth\/[a-z0-9-]+)$/;
const SAFE_ERROR_TYPE = /^[A-Za-z][A-Za-z0-9_$.-]{0,63}$/;

function readStringProperty(
  error: unknown,
  property: 'code' | 'name',
): string | undefined {
  if (
    typeof error !== 'object' ||
    error === null ||
    !(property in error)
  ) {
    return undefined;
  }

  const value = (error as Record<string, unknown>)[property];
  return typeof value === 'string' ? value : undefined;
}

export function createGoogleAuthDiagnostic(
  stage: GoogleAuthStage,
  error: unknown,
): GoogleAuthDiagnostic {
  const candidateCode = readStringProperty(error, 'code') ?? '';
  const candidateType =
    readStringProperty(error, 'name') ??
    (error instanceof Error ? error.constructor.name : '');

  return {
    stage,
    code: SAFE_ERROR_CODE.test(candidateCode)
      ? candidateCode
      : 'AUTH_UNCLASSIFIED',
    errorType: SAFE_ERROR_TYPE.test(candidateType)
      ? candidateType
      : 'UnknownError',
  };
}

export function formatGoogleAuthDiagnostic(
  diagnostic: GoogleAuthDiagnostic,
): string {
  return [
    `stage=${diagnostic.stage}`,
    `code=${diagnostic.code}`,
    `errorType=${diagnostic.errorType}`,
  ].join(' ');
}
