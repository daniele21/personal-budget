import { describe, expect, it } from 'vitest';
import {
  assessAndroidReleaseReadiness,
  DEBUG_ANDROID_PACKAGE,
  PRODUCTION_ANDROID_PACKAGE,
} from '../../../scripts/verify-android-release-readiness';

const capacitorConfig = `
const config = {
  appId: '${PRODUCTION_ANDROID_PACKAGE}',
  server: { androidScheme: 'https' },
};
`;

const appGradle = `
def auraReleaseSigningEnvironment = [
  storeFile: System.getenv("AURA_ANDROID_UPLOAD_STORE_FILE"),
]
def auraReleaseSigningConfigured = true
def auraReleaseTaskRequested = true
if (auraReleaseTaskRequested && !auraReleaseSigningConfigured) {}
android {
  defaultConfig { applicationId "${PRODUCTION_ANDROID_PACKAGE}" }
  buildTypes {
    debug { applicationIdSuffix ".debug" }
    release {
      minifyEnabled true
      shrinkResources true
    }
  }
}
`;

function googleServices(packageName: string): string {
  return JSON.stringify({
    client: [
      {
        client_info: {
          android_client_info: { package_name: packageName },
        },
      },
    ],
  });
}

describe('Android release readiness', () => {
  it('accepts the production package with external fail-closed signing', () => {
    expect(
      assessAndroidReleaseReadiness({
        capacitorConfig,
        appGradle,
        googleServicesJson: googleServices(PRODUCTION_ANDROID_PACKAGE),
      }),
    ).toEqual([]);
  });

  it('rejects a debug-only Google Services configuration', () => {
    expect(
      assessAndroidReleaseReadiness({
        capacitorConfig,
        appGradle,
        googleServicesJson: googleServices(DEBUG_ANDROID_PACKAGE),
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'GOOGLE_SERVICES_DEBUG_ONLY' }),
    );
  });

  it('rejects a remote Capacitor URL and signing that does not fail closed', () => {
    const findings = assessAndroidReleaseReadiness({
      capacitorConfig: `${capacitorConfig}\nconst url = { url: 'https://example.test' };`,
      appGradle: appGradle.replace(
        'if (auraReleaseTaskRequested && !auraReleaseSigningConfigured) {}',
        '',
      ),
      googleServicesJson: googleServices(PRODUCTION_ANDROID_PACKAGE),
    });

    expect(findings.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'CAPACITOR_REMOTE_SERVER_URL',
        'RELEASE_SIGNING_FAIL_CLOSED',
      ]),
    );
  });

  it('reports missing or invalid production configuration without secrets', () => {
    expect(
      assessAndroidReleaseReadiness({
        capacitorConfig,
        appGradle,
        googleServicesJson: null,
      }),
    ).toContainEqual(expect.objectContaining({ code: 'GOOGLE_SERVICES_MISSING' }));

    expect(
      assessAndroidReleaseReadiness({
        capacitorConfig,
        appGradle,
        googleServicesJson: '{invalid',
      }),
    ).toContainEqual(expect.objectContaining({ code: 'GOOGLE_SERVICES_INVALID' }));
  });
});
