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

async function waitForNativeRuntime(client) {
  await waitFor(
    () => client.evaluate(`Boolean(
      window.Capacitor?.getPlatform?.() === 'android'
      && window.Capacitor?.Plugins?.NativeAppRuntime
    )`),
    'Capacitor Android runtime',
    80,
  );
}

async function verifyTransactionImportBoundary(client) {
  await client.evaluate(`(() => {
    const values = {
      aura_transactions: [],
      aura_budgets: [],
      aura_recurring: [],
      aura_accounts: [],
      aura_categories_list: ['Food', 'Travel', 'Groceries'],
      aura_archived_categories_list: [],
      aura_savings_goals: [],
      aura_monthly_budget: 0,
      aura_dark_mode: false
    };
    for (const [key, value] of Object.entries(values)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
    localStorage.setItem('aura_cloud_backup_enabled', 'false');
    localStorage.setItem('aura_onboarding_complete', 'true');
    localStorage.setItem('aura_initial_data_choice', 'blank');
    localStorage.setItem('aura_guided_tour_complete', 'true');
    localStorage.setItem('aura_pwa_install_dialog_shown', 'true');
    history.replaceState({}, '', '/history?import=1');
    location.reload();
    return true;
  })()`);

  await waitFor(
    () => client.evaluate(`Boolean(
      document.querySelector('[role="dialog"] input[type="file"]')
      && document.body.textContent.includes('Import transactions')
    )`),
    'Transaction import dialog',
    80,
  );

  const uploadSurface = await client.evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const text = dialog?.textContent ?? '';
    return {
      hasCsvTemplate: text.includes('CSV template'),
      hasXlsxTemplate: text.includes('XLSX template'),
      fileAccept: dialog?.querySelector('input[type="file"]')?.getAttribute('accept') ?? ''
    };
  })()`);

  const selected = await client.evaluate(`(() => {
    const input = document.querySelector('[role="dialog"] input[type="file"]');
    if (!input) return false;
    const rows = Array.from(
      { length: 20000 },
      (_, index) => '2026-08-01,Synthetic WebView boundary ' + index + ',-1.00'
    );
    const file = new File(
      [['date,description,amount', ...rows].join('\\n')],
      'webview-boundary.csv',
      { type: 'text/csv' }
    );
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  if (!selected) throw new Error('Transaction import file input is unavailable.');

  await waitFor(
    () => client.evaluate(`document.body.textContent.includes('webview-boundary.csv')`),
    'Synthetic import file selection',
  );

  const started = await client.evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('[role="dialog"] button'))
      .find((candidate) => candidate.textContent.trim() === 'Validate file');
    if (!button || button.disabled) return null;
    const timestamp = performance.now();
    button.click();
    return timestamp;
  })()`);
  if (started === null) throw new Error('Validate file action is unavailable.');

  await waitFor(
    () => client.evaluate(`document.body.textContent.includes('Categorize and review')`),
    '20,000-row import review',
    240,
  );

  return client.evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const text = dialog?.textContent ?? '';
    return {
      durationMs: Math.round(performance.now() - ${started}),
      renderedRows: dialog?.querySelectorAll('article').length ?? 0,
      hasExpectedPagination: text.includes('Page 1 of 200'),
      ...${JSON.stringify(uploadSurface)}
    };
  })()`);
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
  await waitForNativeRuntime(client);
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
  await waitForNativeRuntime(client);
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

  const shouldVerifyTransactionImport =
    process.env.AURA_VERIFY_TRANSACTION_IMPORT === 'true';
  const importProbe = shouldVerifyTransactionImport
    ? await verifyTransactionImportBoundary(client)
    : { status: 'not-requested' };

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
  const deepLinkState = await waitFor(async () => {
    const state = await client.evaluate(`(async () => ({
      pending: await window.Capacitor.Plugins.NativeAppRuntime.getPendingAppUrl(),
      path: location.pathname
    }))()`);
    return state?.pending?.url === 'com.staituned.aura.debug://open/data'
      || state?.path === '/data'
      ? state
      : null;
  }, 'Authenticated or pending deep-link delivery');

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
    for (const key of [
      'aura_transactions',
      'aura_budgets',
      'aura_recurring',
      'aura_accounts',
      'aura_categories_list',
      'aura_archived_categories_list',
      'aura_savings_goals',
      'aura_monthly_budget',
      'aura_dark_mode',
      'aura_cloud_backup_enabled',
      'aura_onboarding_complete',
      'aura_initial_data_choice',
      'aura_guided_tour_complete',
      'aura_pwa_install_dialog_shown'
    ]) localStorage.removeItem(key);
    return true;
  })()`);
  client.close();

  const evidence = {
    initial,
    seeded,
    reloadRoute,
    persisted,
    importProbe,
    deepLinkState,
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
    shouldVerifyTransactionImport && importProbe?.renderedRows !== 100 &&
      '20,000-row bounded import rendering',
    shouldVerifyTransactionImport && !importProbe?.hasExpectedPagination &&
      '20,000-row import pagination',
    shouldVerifyTransactionImport && importProbe?.durationMs > 60_000 &&
      '20,000-row import duration',
    shouldVerifyTransactionImport && !importProbe?.hasCsvTemplate &&
      'CSV import template',
    shouldVerifyTransactionImport && !importProbe?.hasXlsxTemplate &&
      'XLSX import template',
    shouldVerifyTransactionImport && !importProbe?.fileAccept.includes('.csv') &&
      'CSV file picker acceptance',
    shouldVerifyTransactionImport && !importProbe?.fileAccept.includes('.xlsx') &&
      'XLSX file picker acceptance',
    deepLinkState?.pending?.url !== 'com.staituned.aura.debug://open/data' &&
      deepLinkState?.path !== '/data' && 'deep-link delivery',
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