/**
 * Read-only, content-free Android notification-listener triage.
 *
 * NEVER print raw adb, dumpsys, secure settings or exception output: these
 * may contain other apps' private notifications and device identifiers.
 * No files are created, permissions changed or notifications dismissed.
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const APP = 'com.staituned.aura';
const V2_CLASS = 'com.staituned.aura.paymentdetection.listener.AuraNotificationListenerServiceV2';
const V2_COMPONENT = `${APP}/${V2_CLASS}`;
const TIMEOUT_MS = 10_000;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

function normalizeComponent(component) {
  const trimmed = component.trim();
  return trimmed.startsWith(`${APP}/.`)
    ? trimmed.replace(`${APP}/.`, `${APP}/${APP}.`)
    : trimmed;
}

/** Returns only exact V2 grant membership, never other granted components. */
export function readRedactedSecureGrant(raw) {
  if (typeof raw !== 'string' || raw.trim() === 'null') return null;
  return raw.trim().split(':').some(
    (entry) => normalizeComponent(entry) === V2_COMPONENT,
  );
}

/**
 * A match in Android's LIVE list is a hint about OS registration, not proof
 * that Aura's process received onListenerConnected or read notifications.
 * Missing/changed OEM section format is UNKNOWN, not a negative observation.
 */
export function readRedactedLiveListener(raw) {
  if (typeof raw !== 'string') {
    return { liveSectionAvailable: false, liveV2Mentioned: null };
  }
  const start = raw.indexOf('Live notification listeners (');
  if (start < 0) {
    return { liveSectionAvailable: false, liveV2Mentioned: null };
  }
  const end = raw.indexOf('Snoozed notification listeners', start);
  const section = raw.slice(start, end >= 0 ? end : start + 32_768);
  return {
    liveSectionAvailable: true,
    liveV2Mentioned: section.includes(V2_CLASS),
  };
}

/** Parse whitelisted version fields only; no app or device identifiers. */
export function readRedactedPackageVersion(raw) {
  if (typeof raw !== 'string') {
    return { versionCode: null, versionName: null };
  }
  const code = raw.match(/\bversionCode=(\d{1,10})\b/);
  const name = raw.match(/\bversionName=([0-9A-Za-z._+\-]{1,40})\b/);
  return {
    versionCode: code ? Number(code[1]) : null,
    versionName: name ? name[1] : null,
  };
}

function runAdb(args, serial) {
  const device = serial ? ['-s', serial] : [];
  try {
    return execFileSync(process.env.ADB_PATH || 'adb', [...device, ...args], {
      encoding: 'utf8',
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
  } catch {
    // Even an exception can include raw stdout/stderr. Never log it.
    return null;
  }
}

function selectedDevice() {
  const devices = runAdb(['devices'], null);
  if (devices == null) return { error: 'ADB_UNAVAILABLE' };
  const ready = devices.split(/\r?\n/).slice(1).filter(
    (line) => /\tdevice\s*$/.test(line),
  );
  const serial = process.env.ANDROID_SERIAL?.trim() || null;
  if (ready.length !== 1 && !serial) return { error: 'SELECT_ONE_DEVICE' };
  if (serial && !ready.some((line) => line.split('\t')[0] === serial)) {
    return { error: 'DEVICE_NOT_READY' };
  }
  return { serial };
}

export function collectRedactedEvidence() {
  const device = selectedDevice();
  if (device.error) return { status: device.error };
  const serial = device.serial;
  const sdkRaw = runAdb(['shell', 'getprop', 'ro.build.version.sdk'], serial);
  const sdk = /^\d{1,3}$/.test((sdkRaw || '').trim())
    ? Number(sdkRaw.trim())
    : null;
  const installed = runAdb(['shell', 'pm', 'path', APP], serial);
  const secure = runAdb(
    ['shell', 'settings', 'get', 'secure', 'enabled_notification_listeners'],
    serial,
  );
  const packageDump = runAdb(['shell', 'dumpsys', 'package', APP], serial);
  const notificationDump = runAdb(['shell', 'dumpsys', 'notification'], serial);
  const serviceDump = runAdb(
    ['shell', 'dumpsys', 'activity', 'services', APP],
    serial,
  );
  const version = readRedactedPackageVersion(packageDump);
  return {
    status: 'READ_ONLY_SNAPSHOT',
    sdk,
    appInstalled: installed === null ? null : installed.includes('package:'),
    ...version,
    secureListV2Granted: readRedactedSecureGrant(secure),
    ...readRedactedLiveListener(notificationDump),
    activityServiceV2Mentioned:
      serviceDump == null ? null : serviceDump.includes(V2_CLASS),
    interpretation: 'Component mentions are not a binder handshake. Cross-check a fresh Aura V2 onCreate/onListenerConnected/snapshot diagnostic.',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Output has a fixed whitelist of content-free fields. Never print raw logs.
  console.log(JSON.stringify(collectRedactedEvidence(), null, 2));
}
