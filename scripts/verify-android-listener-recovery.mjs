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
const listenerClass =
  'com.staituned.aura.paymentdetection.listener.AuraNotificationListenerService';
const listenerComponent = `${auraPackage}/${listenerClass}`;
const setupComponent =
  `${auraPackage}/com.staituned.aura.SyntheticPaymentDetectionSetupActivity`;
const auraApk = 'android/app/build/outputs/apk/debug/app-debug.apk';
const sourceApk =
  'android/notification-test-source/build/outputs/apk/debug/' +
  'notification-test-source-debug.apk';
const probeFile = 'files/aura_payment_detection_probe.txt';
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
    return runAdb(args, { quiet: true });
  } catch {
    return '';
  }
}

function assertDedicatedEmulator() {
  const devices = run(adb, ['devices'], { quiet: true })
    .split('\n')
    .slice(1)
    .filter((line) => line.endsWith('\tdevice'))
    .map((line) => line.split('\t')[0]);
  if (!selectedSerial) {
    throw new Error(
      'Set ANDROID_SERIAL to the dedicated API 36 emulator that may be rebooted.',
    );
  }
  if (!devices.includes(selectedSerial)) {
    throw new Error(`ANDROID_SERIAL ${selectedSerial} is not a ready device.`);
  }
  if (
    runAdb(['shell', 'getprop', 'ro.kernel.qemu'], { quiet: true }).trim() !== '1'
  ) {
    throw new Error('Listener recovery verification is emulator-only.');
  }
  const sdk = runAdb(
    ['shell', 'getprop', 'ro.build.version.sdk'],
    { quiet: true },
  ).trim();
  if (sdk !== '36') {
    throw new Error(`Expected API 36, found API ${sdk || 'unknown'}.`);
  }
}

function startHarness(mode) {
  runAdb(
    [
      'shell',
      'am',
      'start',
      '-W',
      '-n',
      setupComponent,
      '--es',
      'mode',
      mode,
    ],
    { quiet: true },
  );
}

function postSyntheticNotification() {
  startHarness('post');
}

function readProbe() {
  startHarness('probe');
  const output = runAdb(
    ['shell', 'run-as', auraPackage, 'cat', probeFile],
    { quiet: true },
  );
  return Object.fromEntries(
    output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

async function waitForProbe(predicate, label, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const probe = readProbe();
    if (predicate(probe)) return probe;
    await delay(250);
  }
  throw new Error(`${label} did not complete.`);
}

async function waitForBoot() {
  runAdb(['wait-for-device'], { quiet: true });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const completed = tryAdb([
      'shell',
      'getprop',
      'sys.boot_completed',
    ]).trim();
    if (completed === '1') {
      await delay(1500);
      return;
    }
    await delay(1000);
  }
  throw new Error('Emulator did not finish booting within 120 seconds.');
}

function cleanup() {
  try {
    startHarness('cleanup');
  } catch {
    // Cleanup is deliberately idempotent.
  }
  tryAdb(['shell', 'cmd', 'notification', 'disallow_listener', listenerComponent]);
  tryAdb(['uninstall', sourcePackage]);
}

async function main() {
  assertDedicatedEmulator();
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
    'cmd',
    'notification',
    'allow_listener',
    listenerComponent,
  ]);

  try {
    startHarness('simulate');
    await waitForProbe(
      (probe) => Number(probe.exact) >= 1,
      'Initial exact detection',
    );
    console.log('Initial listener detection: PASS');

    runAdb(['shell', 'am', 'force-stop', auraPackage], { quiet: true });
    readProbe();
    await waitForProbe(
      (probe) => probe.connected === 'true',
      'Listener reconnect after process recreation',
    );
    postSyntheticNotification();
    await waitForProbe(
      (probe) => Number(probe.exact) >= 1,
      'Detection after process recreation',
    );
    console.log('Process recreation and listener rebind: PASS');

    runAdb(['reboot'], { quiet: true });
    await waitForBoot();
    postSyntheticNotification();
    await waitForProbe(
      (probe) => Number(probe.exact) >= 1,
      'Detection after emulator reboot',
      80,
    );
    console.log('API 36 emulator reboot recovery: PASS');

    const beforeRevocation = readProbe();
    runAdb([
      'shell',
      'cmd',
      'notification',
      'disallow_listener',
      listenerComponent,
    ]);
    await delay(500);
    postSyntheticNotification();
    await delay(1500);
    const afterRevocation = readProbe();
    if (afterRevocation.exact !== beforeRevocation.exact) {
      throw new Error('A notification was processed after listener revocation.');
    }
    console.log('Listener revocation stops processing: PASS');
  } finally {
    cleanup();
  }
}

main().catch((error) => {
  cleanup();
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
