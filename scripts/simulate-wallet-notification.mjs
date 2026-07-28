import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const projectDirectory = process.cwd();
const androidSdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  '/opt/homebrew/share/android-commandlinetools';
const adb = `${androidSdk}/platform-tools/adb`;
const auraPackage = 'com.staituned.aura.debug';
const sourcePackage = 'com.staituned.aura.syntheticnotifications';
const listenerComponent =
  `${auraPackage}/` +
  'com.staituned.aura.paymentdetection.listener.AuraNotificationListenerService';
const setupComponent =
  `${auraPackage}/com.staituned.aura.SyntheticPaymentDetectionSetupActivity`;
const auraApk = 'android/app/build/outputs/apk/debug/app-debug.apk';
const sourceApk =
  'android/notification-test-source/build/outputs/apk/debug/' +
  'notification-test-source-debug.apk';
let selectedSerial = process.env.ANDROID_SERIAL || null;

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: projectDirectory,
    encoding: 'utf8',
    stdio: options.quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
}

function runAdb(args, options = {}) {
  const serialArguments = selectedSerial ? ['-s', selectedSerial] : [];
  return run(adb, [...serialArguments, ...args], options);
}

function tryAdb(args) {
  try {
    runAdb(args, { quiet: true });
  } catch {
    // Cleanup is deliberately idempotent.
  }
}

function assertSingleEmulator() {
  const devices = run(adb, ['devices'], { quiet: true })
    .split('\n')
    .slice(1)
    .filter((line) => line.endsWith('\tdevice'))
    .map((line) => line.split('\t')[0]);
  if (selectedSerial && !devices.includes(selectedSerial)) {
    throw new Error(`ANDROID_SERIAL ${selectedSerial} is not a ready device.`);
  }
  if (!selectedSerial && devices.length !== 1) {
    throw new Error(
      'Connect one emulator or set ANDROID_SERIAL to the intended emulator.',
    );
  }
  selectedSerial ||= devices[0];
  const isEmulator = runAdb(
    ['shell', 'getprop', 'ro.kernel.qemu'],
    { quiet: true },
  ).trim();
  if (isEmulator !== '1') {
    throw new Error(
      'Wallet notification simulation is restricted to Android emulators.',
    );
  }
}

function cleanup() {
  tryAdb([
    'shell',
    'am',
    'start',
    '-W',
    '-n',
    setupComponent,
    '--es',
    'mode',
    'cleanup',
  ]);
  tryAdb(['shell', 'cmd', 'notification', 'disallow_listener', listenerComponent]);
  tryAdb(['uninstall', sourcePackage]);
}

async function main() {
  assertSingleEmulator();

  if (process.argv.includes('--cleanup')) {
    cleanup();
    console.log('Aura Wallet simulation state cleaned up.');
    return;
  }

  const requestedSeconds = Number.parseInt(
    process.env.AURA_SIMULATION_SECONDS || '30',
    10,
  );
  const durationSeconds = Number.isFinite(requestedSeconds)
    ? Math.min(300, Math.max(5, requestedSeconds))
    : 30;

  cleanup();
  run('bash', [
    'scripts/run-android-gradle.sh',
    ':app:assembleDebug',
    ':notification-test-source:assembleDebug',
  ]);
  runAdb(['install', '-r', auraApk]);
  runAdb(['install', '-r', sourceApk]);
  runAdb([
    'shell',
    'pm',
    'grant',
    sourcePackage,
    'android.permission.POST_NOTIFICATIONS',
  ]);
  runAdb([
    'shell',
    'pm',
    'grant',
    auraPackage,
    'android.permission.POST_NOTIFICATIONS',
  ]);
  runAdb([
    'shell',
    'cmd',
    'notification',
    'allow_listener',
    listenerComponent,
  ]);

  try {
    await delay(1000);
    runAdb([
      'shell',
      'am',
      'start',
      '-W',
      '-n',
      setupComponent,
      '--es',
      'mode',
      'simulate',
    ]);
    console.log(
      `Synthetic Wallet and redacted Aura proposal active for ${durationSeconds} seconds.`,
    );
    console.log('Press Ctrl+C to clean up early.');
    await Promise.race([
      delay(durationSeconds * 1000),
      new Promise((resolve) => {
        process.once('SIGINT', resolve);
        process.once('SIGTERM', resolve);
      }),
    ]);
  } finally {
    cleanup();
  }
  console.log('Simulation complete; listener and test source were removed.');
}

main().catch((error) => {
  cleanup();
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
