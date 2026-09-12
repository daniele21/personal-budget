import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const packageName = 'com.staituned.aura.debug';
const activityName = 'com.staituned.aura.MainActivity';
const appComponent = `${packageName}/${activityName}`;
const devtoolsPort = 9224;
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

async function waitFor(predicate, label, attempts = 120) {
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
  throw new Error(`${label} did not become ready.${lastError ? ` ${lastError.message}` : ''}`);
}

async function connectToWebView() {
  const pid = await waitFor(
    () => runAdb('shell', 'pidof', packageName),
    'Aura process',
  );
  runAdb('forward', `tcp:${devtoolsPort}`, `localabstract:webview_devtools_remote_${pid}`);

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
      socket.send(JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: { expression, awaitPromise: true, returnByValue: true },
      }));
    });

  return { evaluate, close: () => socket.close() };
}

async function main() {
  const devices = runAdb('devices');
  if (!devices.split('\n').slice(1).some((line) => line.endsWith('\tdevice'))) {
    throw new Error('No ready Android emulator or device is connected.');
  }
  if (!runAdb('shell', 'pm', 'path', packageName)) {
    throw new Error('The packaged Aura debug APK is not installed.');
  }

  // The two-APK runner installs Aura before Harnex authorization. Do not replace the
  // package here: package replacement can trigger Host reconciliation and would make
  // the integrated evidence depend on authorization timing rather than the user flow.
  runAdb('shell', 'am', 'force-stop', packageName);
  runAdb('shell', 'am', 'start', '-W', '-n', appComponent);

  const client = await connectToWebView();
  try {
    await waitFor(
      () => client.evaluate(`Boolean(
        window.Capacitor?.getPlatform?.() === 'android'
        && window.Capacitor?.Plugins?.NativeHarnex
      )`),
      'Capacitor Android Harnex runtime',
      160,
    );

    await waitFor(
      () => client.evaluate(`Boolean(
        !document.body.textContent.includes('Continue with Google')
        && document.querySelector('[data-tour-id="bottom-nav-transactions"]')
      )`),
      'Authenticated Aura shell',
      160,
    );

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
      160,
    );

    const selected = await client.evaluate(`(() => {
      const input = document.querySelector('[role="dialog"] input[type="file"]');
      if (!input) return false;
      const file = new File([
        [
          'Booking Date,Details,Amount',
          '2026-09-01,Synthetic Harnex Market,-42.00',
          '2026-09-02,Synthetic Harnex Taxi,-18.00'
        ].join('\\n')
      ], 'harnex-assisted-bank.csv', { type: 'text/csv' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    if (!selected) throw new Error('Transaction import file input is unavailable.');

    await waitFor(
      () => client.evaluate(`document.body.textContent.includes('harnex-assisted-bank.csv')`),
      'Synthetic assisted import file selection',
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
      () => client.evaluate(`document.body.textContent.includes('Suggested mapping ready')`),
      'Harnex-assisted schema mapping',
      240,
    );

    const mapping = await client.evaluate(`(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const controlByLabel = (text) => {
        const label = Array.from(dialog?.querySelectorAll('label') ?? [])
          .find((candidate) => candidate.textContent.trim() === text);
        return label?.htmlFor ? document.getElementById(label.htmlFor) : null;
      };
      const date = controlByLabel('Transaction date');
      const amount = controlByLabel('Amount');
      const description = Array.from(dialog?.querySelectorAll('input[type="checkbox"]') ?? [])
        .find((candidate) => candidate.checked);
      return {
        dateSelected: Boolean(date?.value),
        amountSelected: Boolean(amount?.value),
        descriptionSelected: Boolean(description),
        ledgerBeforeConfirm: JSON.parse(localStorage.getItem('aura_transactions') ?? '[]').length
      };
    })()`);
    if (!mapping?.dateSelected || !mapping?.amountSelected || !mapping?.descriptionSelected) {
      throw new Error(`Harnex suggestion did not populate a complete Aura mapping: ${JSON.stringify(mapping)}`);
    }
    if (mapping.ledgerBeforeConfirm !== 0) throw new Error('Ledger changed before mapping confirmation.');

    const confirmed = await client.evaluate(`(() => {
      const button = Array.from(document.querySelectorAll('[role="dialog"] button'))
        .find((candidate) => candidate.textContent.trim() === 'Confirm mapping');
      if (!button || button.disabled) return false;
      button.click();
      return true;
    })()`);
    if (!confirmed) throw new Error('Confirmed mapping action is unavailable.');

    await waitFor(
      () => client.evaluate(`document.body.textContent.includes('Categorize and review')`),
      'Harnex-assisted category review',
      240,
    );

    const review = await client.evaluate(`(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const text = dialog?.textContent ?? '';
      const ledger = JSON.parse(localStorage.getItem('aura_transactions') ?? '[]');
      return {
        ledgerRows: ledger.length,
        hasUncategorized: text.includes('Needs category'),
        hasFoodSuggestion: text.includes('Food'),
        hasMarket: text.includes('Synthetic Harnex Market'),
        hasTaxi: text.includes('Synthetic Harnex Taxi')
      };
    })()`);
    if (review?.ledgerRows !== 0) throw new Error('Ledger changed before verified Review/commit.');
    if (review?.hasUncategorized || !review?.hasFoodSuggestion || !review?.hasMarket || !review?.hasTaxi) {
      throw new Error(`Category review did not contain expected safe suggestions: ${JSON.stringify(review)}`);
    }

    const reviewOpened = await client.evaluate(`(() => {
      const button = Array.from(document.querySelectorAll('[role="dialog"] button'))
        .find((candidate) => candidate.textContent.trim() === 'Review 2 transactions');
      if (!button || button.disabled) return false;
      button.click();
      return true;
    })()`);
    if (!reviewOpened) throw new Error('Review action is unavailable.');

    await waitFor(
      () => client.evaluate(`document.body.textContent.includes('Every included transaction has a category.')`),
      'Verified import review',
    );

    const committed = await client.evaluate(`(() => {
      const button = Array.from(document.querySelectorAll('[role="dialog"] button'))
        .find((candidate) => candidate.textContent.trim() === 'Import 2 transactions');
      if (!button || button.disabled) return false;
      button.click();
      return true;
    })()`);
    if (!committed) throw new Error('Verified import commit action is unavailable.');

    await waitFor(
      () => client.evaluate(`document.body.textContent.includes('Import complete')`),
      'Completed assisted transaction import',
      160,
    );

    const evidence = await client.evaluate(`(() => {
      const transactions = JSON.parse(localStorage.getItem('aura_transactions') ?? '[]');
      const forbiddenKeys = ['categorySource', 'harnex', 'harnexMetadata', 'importMetadata', 'sourceMetadata'];
      return {
        durationMs: Math.round(performance.now() - ${started}),
        count: transactions.length,
        titles: transactions.map((transaction) => transaction.title).sort(),
        categories: transactions.map((transaction) => transaction.category),
        allExpenses: transactions.every((transaction) => transaction.type === 'expense'),
        metadataClean: transactions.every((transaction) =>
          forbiddenKeys.every((key) => !Object.prototype.hasOwnProperty.call(transaction, key))
        )
      };
    })()`);

    const failures = [
      evidence?.count !== 2 && 'two committed transactions',
      JSON.stringify(evidence?.titles) !== JSON.stringify(['Synthetic Harnex Market', 'Synthetic Harnex Taxi']) && 'deterministic descriptions',
      !evidence?.categories?.every((category) => category === 'Food') && 'Harnex category suggestions constrained to Aura categories',
      !evidence?.allExpenses && 'deterministic amount/type extraction',
      !evidence?.metadataClean && 'canonical ledger metadata isolation',
      evidence?.durationMs > 60_000 && 'bounded assisted import duration',
    ].filter(Boolean);
    if (failures.length > 0) throw new Error(`Harnex assisted import verification failed: ${failures.join(', ')}`);

    console.log(JSON.stringify({ status: 'PASS', mapping, review, evidence }, null, 2));
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
