import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const packageName = 'com.staituned.aura.debug';
const activityName = 'com.staituned.aura.MainActivity';
const appComponent = `${packageName}/${activityName}`;
const debugApk = 'android/app/build/outputs/apk/debug/app-debug.apk';
const devtoolsPort = 9223;
const storageKey = 'aura_m1_webview_probe';
const databaseName = 'aura-m1-webview-verification';
const attachmentDatabaseName = 'keyval-store';
const attachmentStoreName = 'keyval';
const attachmentKey = 'attachment_m1-webview-probe';
const attachmentValue = 'data:image/png;base64,AQID';
const probeToken = `probe-${Date.now()}`;

const androidSdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  '/opt/homebrew/share/android-commandlinetools';
const adb = `${androidSdk}/platform-tools/adb`;

function runAdb(...args) {
  return execFileSync(adb, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

async function waitFor(predicate, label, attempts = 40) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const value = await predicate();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(
    `${label} did not become ready.${lastError ? ` ${lastError.message}` : ''}`,
  );
}

async function connectToWebView() {
  const pid = await waitFor(
    () => runAdb('shell', 'pidof', packageName),
    'Aura process',
  );
  runAdb(
    'forward',
    `tcp:${devtoolsPort}`,
    `localabstract:webview_devtools_remote_${pid}`,
  );

  const page = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${devtoolsPort}/json/list`);
    if (!response.ok) return null;
    const pages = await response.json();
    return pages.find((candidate) => candidate.type === 'page') ?? null;
  }, 'Aura WebView DevTools endpoint');

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let commandId = 0;
  const evaluate = (expression) =>
    new Promise((resolve, reject) => {
      const id = ++commandId;
      const onMessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.id !== id) return;
        socket.removeEventListener('message', onMessage);
        if (message.error) {
          reject(new Error(JSON.stringify(message.error)));
          return;
        }
        if (message.result?.exceptionDetails) {
          reject(new Error(message.result.exceptionDetails.text));
          return;
        }
        resolve(message.result?.result?.value);
      };
      socket.addEventListener('message', onMessage);
      socket.send(
        JSON.stringify({
          id,
          method: 'Runtime.evaluate',
          params: {
            expression,
            awaitPromise: true,
            returnByValue: true,
          },
        }),
      );
    });

  return {
    evaluate,
    close: () => socket.close(),
  };
}

function startMainActivity() {
  return runAdb('shell', 'am', 'start', '-W', '-n', appComponent);
}

async function main() {
  const devices = runAdb('devices');
  if (!devices.split('\n').slice(1).some((line) => line.endsWith('\tdevice'))) {
    throw new Error('No ready Android emulator or device is connected.');
  }

  runAdb('install', '-r', debugApk);
  runAdb('shell', 'am', 'force-stop', packageName);
  const coldStart = startMainActivity();

  let client = await connectToWebView();
  const initial = await client.evaluate(`({
    url: location.href,
    title: document.title,
    platform: window.Capacitor?.getPlatform?.(),
    hasRuntimePlugin: Boolean(window.Capacitor?.Plugins?.NativeAppRuntime)
  })`);

  const seeded = await client.evaluate(`(async () => {
    localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(probeToken)});
    await new Promise((resolve, reject) => {
      const request = indexedDB.open(${JSON.stringify(databaseName)}, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('probes');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const transaction = request.result.transaction('probes', 'readwrite');
        transaction.objectStore('probes').put(${JSON.stringify(probeToken)}, 'current');
        transaction.oncomplete = () => {
          request.result.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
    await new Promise((resolve, reject) => {
      const request = indexedDB.open(${JSON.stringify(attachmentDatabaseName)}, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(${JSON.stringify(attachmentStoreName)});
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const transaction = request.result.transaction(${JSON.stringify(attachmentStoreName)}, 'readwrite');
        transaction.objectStore(${JSON.stringify(attachmentStoreName)}).put(
          ${JSON.stringify(attachmentValue)},
          ${JSON.stringify(attachmentKey)}
        );
        transaction.oncomplete = () => {
          request.result.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
    history.pushState({}, '', '/reports');
    return {
      localStorage: localStorage.getItem(${JSON.stringify(storageKey)}),
      path: location.pathname
    };
  })()`);

  await client.evaluate('location.reload(); true');
  // Web Storage writes are synchronous to JavaScript but Chromium flushes the
  // backing file asynchronously. Give the real WebView a bounded flush window
  // before force-stopping the process so this test measures persistence rather
  // than scheduler timing.
  await delay(1500);
  const reloadRoute = await client.evaluate('location.pathname');
  client.close();

  runAdb('shell', 'am', 'force-stop', packageName);
  const restart = startMainActivity();
  client = await connectToWebView();
  const persisted = await client.evaluate(`(async () => {
    const indexedDbValue = await new Promise((resolve, reject) => {
      const request = indexedDB.open(${JSON.stringify(databaseName)}, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const transaction = request.result.transaction('probes', 'readonly');
        const getRequest = transaction.objectStore('probes').get('current');
        getRequest.onsuccess = () => {
          request.result.close();
          resolve(getRequest.result ?? null);
        };
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
    const attachmentValue = await new Promise((resolve, reject) => {
      const request = indexedDB.open(${JSON.stringify(attachmentDatabaseName)}, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const transaction = request.result.transaction(${JSON.stringify(attachmentStoreName)}, 'readonly');
        const getRequest = transaction.objectStore(${JSON.stringify(attachmentStoreName)}).get(
          ${JSON.stringify(attachmentKey)}
        );
        getRequest.onsuccess = () => {
          request.result.close();
          resolve(getRequest.result ?? null);
        };
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
    return {
      localStorage: localStorage.getItem(${JSON.stringify(storageKey)}),
      indexedDb: indexedDbValue,
      attachment: attachmentValue,
      path: location.pathname
    };
  })()`);

  const deepLinkStart = runAdb(
    'shell',
    'am',
    'start',
    '-W',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    'com.staituned.aura.debug://open/data',
    packageName,
  );
  await delay(250);
  const pendingAppUrl = await client.evaluate(
    'window.Capacitor.Plugins.NativeAppRuntime.getPendingAppUrl()',
  );

  await client.evaluate(`(async () => {
    await window.Capacitor.Plugins.NativeAppRuntime.clearPendingAppUrl();
    localStorage.removeItem(${JSON.stringify(storageKey)});
    indexedDB.deleteDatabase(${JSON.stringify(databaseName)});
    await new Promise((resolve, reject) => {
      const request = indexedDB.open(${JSON.stringify(attachmentDatabaseName)}, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const transaction = request.result.transaction(${JSON.stringify(attachmentStoreName)}, 'readwrite');
        transaction.objectStore(${JSON.stringify(attachmentStoreName)}).delete(
          ${JSON.stringify(attachmentKey)}
        );
        transaction.oncomplete = () => {
          request.result.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
    history.replaceState({}, '', '/');
    return true;
  })()`);
  client.close();

  const evidence = {
    initial,
    seeded,
    reloadRoute,
    persisted,
    pendingAppUrl,
    coldStart: /LaunchState: COLD/.test(coldStart),
    restartSucceeded: /Status: ok/.test(restart),
    deepLinkDelivered: /Status: ok/.test(deepLinkStart),
  };

  const failures = [
    initial?.url !== 'https://localhost/' && 'bundled local origin',
    initial?.platform !== 'android' && 'Android platform detection',
    !initial?.hasRuntimePlugin && 'NativeAppRuntime registration',
    seeded?.localStorage !== probeToken && 'localStorage write',
    reloadRoute !== '/reports' && 'BrowserRouter reload fallback',
    persisted?.localStorage !== probeToken && 'localStorage restart persistence',
    persisted?.indexedDb !== probeToken && 'IndexedDB restart persistence',
    persisted?.attachment !== attachmentValue && 'attachment restart persistence',
    pendingAppUrl?.url !== 'com.staituned.aura.debug://open/data' &&
      'deep-link delivery',
  ].filter(Boolean);

  console.log(JSON.stringify(evidence, null, 2));
  if (failures.length > 0) {
    throw new Error(`Android WebView verification failed: ${failures.join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
