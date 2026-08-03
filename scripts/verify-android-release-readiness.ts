import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PRODUCTION_ANDROID_PACKAGE = 'com.staituned.aura';
export const DEBUG_ANDROID_PACKAGE = 'com.staituned.aura.debug';

export interface AndroidReleaseReadinessInput {
  capacitorConfig: string;
  appGradle: string;
  debugGoogleServicesJson: string | null;
  releaseGoogleServicesJson: string | null;
  bundledWebAssets: string[] | null;
}

export interface AndroidReleaseReadinessFinding {
  code: string;
  message: string;
}

interface GoogleServicesConfiguration {
  project_info?: {
    project_id?: string;
    project_number?: string;
  };
  client?: Array<{
    client_info?: {
      android_client_info?: {
        package_name?: string;
      };
    };
    oauth_client?: Array<{
      client_type?: number;
    }>;
  }>;
}

type GoogleServicesVariant = 'debug' | 'release';

function hasPattern(source: string, pattern: RegExp): boolean {
  return pattern.test(source);
}

function validateGoogleServicesConfiguration(
  source: string | null,
  variant: GoogleServicesVariant,
  expectedPackage: string,
): AndroidReleaseReadinessFinding[] {
  const prefix = variant === 'debug'
    ? 'GOOGLE_SERVICES_DEBUG'
    : 'GOOGLE_SERVICES_RELEASE';
  const path = `android/app/src/${variant}/google-services.json`;

  if (source === null) {
    return [{
      code: `${prefix}_MISSING`,
      message: `${path} is missing; provide the untracked ${variant} configuration.`,
    }];
  }

  let googleServices: GoogleServicesConfiguration;
  try {
    googleServices = JSON.parse(source) as GoogleServicesConfiguration;
  } catch {
    return [{
      code: `${prefix}_INVALID`,
      message: `${path} is not valid JSON.`,
    }];
  }

  const packages = new Set(
    (googleServices.client ?? [])
      .map(
        (client) =>
          client.client_info?.android_client_info?.package_name?.trim() ?? '',
      )
      .filter(Boolean),
  );

  if (!packages.has(expectedPackage)) {
    return [{
      code: `${prefix}_CLIENT`,
      message: `${path} must contain an Android client for ${expectedPackage}.`,
    }];
  }

  const expectedClient = (googleServices.client ?? []).find(
    (client) =>
      client.client_info?.android_client_info?.package_name?.trim() ===
      expectedPackage,
  );
  const hasWebOAuthClient = (expectedClient?.oauth_client ?? []).some(
    (client) => client.client_type === 3,
  );
  if (!hasWebOAuthClient) {
    return [{
      code: `${prefix}_WEB_OAUTH_CLIENT`,
      message:
        `${path} must contain a Web OAuth client for native Google authentication.`,
    }];
  }

  const projectId = googleServices.project_info?.project_id?.trim();
  const projectNumber = googleServices.project_info?.project_number?.trim();
  if (!projectId || !projectNumber) {
    return [{
      code: `${prefix}_PROJECT`,
      message: `${path} must contain bounded project identity fields.`,
    }];
  }

  return [];
}

function readProjectMarkers(source: string | null): string[] | null {
  if (source === null) return null;
  try {
    const configuration = JSON.parse(source) as GoogleServicesConfiguration;
    const markers = [
      configuration.project_info?.project_id?.trim(),
      configuration.project_info?.project_number?.trim(),
    ].filter((value): value is string => Boolean(value));
    return markers.length === 2 ? markers : null;
  } catch {
    return null;
  }
}

function validateBundledWebAssets(
  assets: string[] | null,
  debugGoogleServicesJson: string | null,
  releaseGoogleServicesJson: string | null,
): AndroidReleaseReadinessFinding[] {
  if (assets === null || assets.length === 0) {
    return [{
      code: 'BUNDLED_WEB_ASSETS_MISSING',
      message:
        'Android WebView assets are missing; run npm run android:sync before release verification.',
    }];
  }

  const debugMarkers = readProjectMarkers(debugGoogleServicesJson);
  const releaseMarkers = readProjectMarkers(releaseGoogleServicesJson);
  if (debugMarkers === null || releaseMarkers === null) return [];

  const bundledSource = assets.join('\n');
  const debugOnlyMarkers = debugMarkers.filter(
    (marker) => !releaseMarkers.includes(marker),
  );
  if (debugOnlyMarkers.some((marker) => bundledSource.includes(marker))) {
    return [{
      code: 'BUNDLED_WEB_ASSETS_DEBUG_FIREBASE',
      message:
        'Android WebView assets contain the debug Firebase project; run npm run android:sync.',
    }];
  }

  if (!releaseMarkers.every((marker) => bundledSource.includes(marker))) {
    return [{
      code: 'BUNDLED_WEB_ASSETS_PRODUCTION_FIREBASE',
      message:
        'Android WebView assets do not contain the production Firebase project; run npm run android:sync.',
    }];
  }

  return [];
}

export function assessAndroidReleaseReadiness(
  input: AndroidReleaseReadinessInput,
): AndroidReleaseReadinessFinding[] {
  const findings: AndroidReleaseReadinessFinding[] = [];

  if (
    !hasPattern(
      input.capacitorConfig,
      /appId:\s*['"]com\.staituned\.aura['"]/,
    )
  ) {
    findings.push({
      code: 'CAPACITOR_PRODUCTION_APP_ID',
      message: `Capacitor appId must be ${PRODUCTION_ANDROID_PACKAGE}.`,
    });
  }

  if (hasPattern(input.capacitorConfig, /\burl\s*:/)) {
    findings.push({
      code: 'CAPACITOR_REMOTE_SERVER_URL',
      message: 'A production Android bundle must not load a remote server URL.',
    });
  }

  const gradleRequirements: Array<[RegExp, string, string]> = [
    [
      /applicationId\s+["']com\.staituned\.aura["']/,
      'GRADLE_PRODUCTION_APP_ID',
      `Gradle applicationId must be ${PRODUCTION_ANDROID_PACKAGE}.`,
    ],
    [
      /applicationIdSuffix\s+["']\.debug["']/,
      'GRADLE_DEBUG_SUFFIX',
      'The debug build must retain its .debug package boundary.',
    ],
    [
      /release\s*\{[\s\S]*?minifyEnabled\s+true/,
      'RELEASE_MINIFICATION',
      'Release minification must remain enabled.',
    ],
    [
      /release\s*\{[\s\S]*?shrinkResources\s+true/,
      'RELEASE_RESOURCE_SHRINKING',
      'Release resource shrinking must remain enabled.',
    ],
    [
      /AURA_ANDROID_UPLOAD_STORE_FILE/,
      'RELEASE_EXTERNAL_SIGNING',
      'Release signing must be supplied outside the repository.',
    ],
    [
      /auraReleaseTaskRequested\s*&&\s*!auraReleaseSigningConfigured/,
      'RELEASE_SIGNING_FAIL_CLOSED',
      'Release tasks must fail when upload-key configuration is absent.',
    ],
  ];

  for (const [pattern, code, message] of gradleRequirements) {
    if (!hasPattern(input.appGradle, pattern)) {
      findings.push({ code, message });
    }
  }

  findings.push(
    ...validateGoogleServicesConfiguration(
      input.debugGoogleServicesJson,
      'debug',
      DEBUG_ANDROID_PACKAGE,
    ),
    ...validateGoogleServicesConfiguration(
      input.releaseGoogleServicesJson,
      'release',
      PRODUCTION_ANDROID_PACKAGE,
    ),
    ...validateBundledWebAssets(
      input.bundledWebAssets,
      input.debugGoogleServicesJson,
      input.releaseGoogleServicesJson,
    ),
  );

  return findings;
}

async function readBundledWebAssets(path: string): Promise<string[] | null> {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    const sources = await Promise.all(
      entries.map(async (entry): Promise<string[]> => {
        const entryPath = resolve(path, entry.name);
        if (entry.isDirectory()) return (await readBundledWebAssets(entryPath)) ?? [];
        if (!entry.isFile() || !/\.(?:html|js)$/.test(entry.name)) return [];
        return [await readFile(entryPath, 'utf8')];
      }),
    );
    return sources.flat();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return null;
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const workspace = resolve(import.meta.dirname, '..');
  const findings = assessAndroidReleaseReadiness({
    capacitorConfig: await readFile(
      resolve(workspace, 'capacitor.config.ts'),
      'utf8',
    ),
    appGradle: await readFile(
      resolve(workspace, 'android/app/build.gradle'),
      'utf8',
    ),
    debugGoogleServicesJson: await readOptionalFile(
      resolve(workspace, 'android/app/src/debug/google-services.json'),
    ),
    releaseGoogleServicesJson: await readOptionalFile(
      resolve(workspace, 'android/app/src/release/google-services.json'),
    ),
    bundledWebAssets: await readBundledWebAssets(
      resolve(workspace, 'android/app/src/main/assets/public'),
    ),
  });

  if (findings.length > 0) {
    console.error('Android release readiness: BLOCKED');
    for (const finding of findings) {
      console.error(`- ${finding.code}: ${finding.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Android release readiness: configuration checks passed.');
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedPath === import.meta.url) {
  await main();
}
