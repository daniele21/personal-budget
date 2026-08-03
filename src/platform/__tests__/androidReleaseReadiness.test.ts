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

const debugProject = {
  id: 'aura-debug-project',
  number: '100000000001',
};
const productionProject = {
  id: 'aura-production-project',
  number: '100000000002',
};

function googleServices(
  packageName: string,
  project: { id: string; number: string },
): string {
  return JSON.stringify({
    project_info: {
      project_id: project.id,
      project_number: project.number,
    },
    client: [
      {
        client_info: {
          android_client_info: { package_name: packageName },
        },
        oauth_client: [{ client_type: 3 }],
      },
    ],
  });
}

const productionWebAssets = [
  `projectId:${productionProject.id};messagingSenderId:${productionProject.number}`,
];

describe('Android release readiness', () => {
  it('accepts the production package with external fail-closed signing', () => {
    expect(
      assessAndroidReleaseReadiness({
        capacitorConfig,
        appGradle,
        debugGoogleServicesJson: googleServices(
          DEBUG_ANDROID_PACKAGE,
          debugProject,
        ),
        releaseGoogleServicesJson: googleServices(
          PRODUCTION_ANDROID_PACKAGE,
          productionProject,
        ),
        bundledWebAssets: productionWebAssets,
      }),
    ).toEqual([]);
  });

  it('rejects Google Services configurations assigned to the wrong variant', () => {
    expect(
      assessAndroidReleaseReadiness({
        capacitorConfig,
        appGradle,
        debugGoogleServicesJson: googleServices(
          PRODUCTION_ANDROID_PACKAGE,
          debugProject,
        ),
        releaseGoogleServicesJson: googleServices(
          DEBUG_ANDROID_PACKAGE,
          productionProject,
        ),
        bundledWebAssets: productionWebAssets,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'GOOGLE_SERVICES_DEBUG_CLIENT' }),
        expect.objectContaining({ code: 'GOOGLE_SERVICES_RELEASE_CLIENT' }),
      ]),
    );
  });

  it('rejects a remote Capacitor URL and signing that does not fail closed', () => {
    const findings = assessAndroidReleaseReadiness({
      capacitorConfig: `${capacitorConfig}\nconst url = { url: 'https://example.test' };`,
      appGradle: appGradle.replace(
        'if (auraReleaseTaskRequested && !auraReleaseSigningConfigured) {}',
        '',
      ),
      debugGoogleServicesJson: googleServices(
        DEBUG_ANDROID_PACKAGE,
        debugProject,
      ),
      releaseGoogleServicesJson: googleServices(
        PRODUCTION_ANDROID_PACKAGE,
        productionProject,
      ),
      bundledWebAssets: productionWebAssets,
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
        debugGoogleServicesJson: null,
        releaseGoogleServicesJson: null,
        bundledWebAssets: null,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'GOOGLE_SERVICES_DEBUG_MISSING' }),
        expect.objectContaining({ code: 'GOOGLE_SERVICES_RELEASE_MISSING' }),
      ]),
    );

    expect(
      assessAndroidReleaseReadiness({
        capacitorConfig,
        appGradle,
        debugGoogleServicesJson: '{invalid',
        releaseGoogleServicesJson: '{invalid',
        bundledWebAssets: productionWebAssets,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'GOOGLE_SERVICES_DEBUG_INVALID' }),
        expect.objectContaining({ code: 'GOOGLE_SERVICES_RELEASE_INVALID' }),
      ]),
    );
  });

  it('rejects stale debug Firebase assets in a release bundle', () => {
    const findings = assessAndroidReleaseReadiness({
      capacitorConfig,
      appGradle,
      debugGoogleServicesJson: googleServices(
        DEBUG_ANDROID_PACKAGE,
        debugProject,
      ),
      releaseGoogleServicesJson: googleServices(
        PRODUCTION_ANDROID_PACKAGE,
        productionProject,
      ),
      bundledWebAssets: [
        `projectId:${debugProject.id};messagingSenderId:${debugProject.number}`,
      ],
    });

    expect(findings).toContainEqual(
      expect.objectContaining({ code: 'BUNDLED_WEB_ASSETS_DEBUG_FIREBASE' }),
    );
  });

  it('rejects assets that omit the production Firebase project', () => {
    const findings = assessAndroidReleaseReadiness({
      capacitorConfig,
      appGradle,
      debugGoogleServicesJson: googleServices(
        DEBUG_ANDROID_PACKAGE,
        debugProject,
      ),
      releaseGoogleServicesJson: googleServices(
        PRODUCTION_ANDROID_PACKAGE,
        productionProject,
      ),
      bundledWebAssets: ['const unrelated = true;'],
    });

    expect(findings).toContainEqual(
      expect.objectContaining({ code: 'BUNDLED_WEB_ASSETS_PRODUCTION_FIREBASE' }),
    );
  });

  it('rejects a release configuration without its Web OAuth client', () => {
    const releaseWithoutWebClient = JSON.parse(
      googleServices(PRODUCTION_ANDROID_PACKAGE, productionProject),
    );
    releaseWithoutWebClient.client[0].oauth_client = [{ client_type: 1 }];

    const findings = assessAndroidReleaseReadiness({
      capacitorConfig,
      appGradle,
      debugGoogleServicesJson: googleServices(
        DEBUG_ANDROID_PACKAGE,
        debugProject,
      ),
      releaseGoogleServicesJson: JSON.stringify(releaseWithoutWebClient),
      bundledWebAssets: productionWebAssets,
    });

    expect(findings).toContainEqual(
      expect.objectContaining({
        code: 'GOOGLE_SERVICES_RELEASE_WEB_OAUTH_CLIENT',
      }),
    );
  });
});
