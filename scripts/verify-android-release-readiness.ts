import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PRODUCTION_ANDROID_PACKAGE = 'com.staituned.aura';
export const DEBUG_ANDROID_PACKAGE = 'com.staituned.aura.debug';

export interface AndroidReleaseReadinessInput {
  capacitorConfig: string;
  appGradle: string;
  googleServicesJson: string | null;
}

export interface AndroidReleaseReadinessFinding {
  code: string;
  message: string;
}

interface GoogleServicesConfiguration {
  client?: Array<{
    client_info?: {
      android_client_info?: {
        package_name?: string;
      };
    };
  }>;
}

function hasPattern(source: string, pattern: RegExp): boolean {
  return pattern.test(source);
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

  if (input.googleServicesJson === null) {
    findings.push({
      code: 'GOOGLE_SERVICES_MISSING',
      message:
        'android/app/google-services.json is missing; provide the untracked production configuration.',
    });
    return findings;
  }

  let googleServices: GoogleServicesConfiguration;
  try {
    googleServices = JSON.parse(
      input.googleServicesJson,
    ) as GoogleServicesConfiguration;
  } catch {
    findings.push({
      code: 'GOOGLE_SERVICES_INVALID',
      message: 'android/app/google-services.json is not valid JSON.',
    });
    return findings;
  }

  const packages = new Set(
    (googleServices.client ?? [])
      .map(
        (client) =>
          client.client_info?.android_client_info?.package_name?.trim() ?? '',
      )
      .filter(Boolean),
  );

  if (!packages.has(PRODUCTION_ANDROID_PACKAGE)) {
    findings.push({
      code: packages.has(DEBUG_ANDROID_PACKAGE)
        ? 'GOOGLE_SERVICES_DEBUG_ONLY'
        : 'GOOGLE_SERVICES_PRODUCTION_CLIENT',
      message: `Google Services must contain an Android client for ${PRODUCTION_ANDROID_PACKAGE}; the debug client is not valid for release.`,
    });
  }

  return findings;
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
    googleServicesJson: await readOptionalFile(
      resolve(workspace, 'android/app/google-services.json'),
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
