import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const packageName = 'com.staituned.aura.debug';
const activityName = 'com.staituned.aura.MainActivity';
const appComponent = `${packageName}/${activityName}`;
const devtoolsPort = 9224;

function runAdb(...args) {
  return execFileSync('adb', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

async function waitFor(predicate, label, attempts = 100) {
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
  const pid = await waitFor(() => runAdb('shell', 'pidof', packageName), 'Aura process');
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
  const evaluate = (expression) => new Promise((resolve, reject) => {
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
  runAdb('shell', 'am', 'force-stop', packageName);
  runAdb('shell', 'am', 'start', '-W', '-n', appComponent);
  const client = await connectToWebView();

  try {
    await waitFor(
      () => client.evaluate(`Boolean(
        window.Capacitor?.getPlatform?.() === 'android'
        && window.Capacitor?.Plugins?.NativeHarnex
      )`),
      'Aura NativeHarnex Capacitor bridge',
    );

    await client.evaluate(`(() => {
      const values = {
        aura_transactions: [],
        aura_budgets: [],
        aura_recurring: [],
        aura_accounts: [],
        aura_categories_list: ['Groceries', 'Travel'],
        aura_archived_categories_list: [],
        aura_savings_goals: [],
        aura_monthly_budget: 0,
        aura_dark_mode: false
      };
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
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
    );

    const selected = await client.evaluate(`(() => {
      const input = document.querySelector('[role="dialog"] input[type="file"]');
      if (!input) return false;
      const csv = [
        'Booking Date,Details,Amount',
        '2026-09-01,Android assisted grocery,-42.00',
        '2026-09-02,Android assisted travel,-18.50'
      ].join('\\n');
      const file = new File([csv], 'android-assisted.csv', { type: 'text/csv' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    if (!selected) throw new Error('Transaction import file input is unavailable.');

    await waitFor(
      () => client.evaluate(`document.body.textContent.includes('android-assisted.csv')`),
      'Synthetic assisted file selection',
    );

    const started = await client.evaluate(`(() => {
      const button = Array.from(document.querySelectorAll('[role="dialog"] button'))
        .find((candidate) => candidate.textContent.trim() === 'Validate file');
      if (!button || button.disabled) return null;
      button.click();
      return performance.now();
    })()`);
    if (started === null) throw new Error('Validate file action is unavailable.');

    await waitFor(
      () => client.evaluate(`document.body.textContent.includes('Suggested mapping ready')`),
      'Harnex-assisted mapping suggestion',
      160,
    );

    const mapping = await client.evaluate(`(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const selects = Array.from(dialog?.querySelectorAll('select') ?? []);
      const checkbox = dialog?.querySelector('input[type="checkbox"]');
      const confirm = Array.from(dialog?.querySelectorAll('button') ?? [])
        .find((candidate) => candidate.textContent.trim() === 'Confirm mapping');
      return {
        dateSelected: Boolean(selects[0]?.value),
        amountSelected: Boolean(selects[1]?.value),
        descriptionSelected: Boolean(checkbox?.checked),
        confirmEnabled: Boolean(confirm && !confirm.disabled)
      };
    })()`);
    if (!mapping?.dateSelected || !mapping?.amountSelected || !mapping?.descriptionSelected || !mapping?.confirmEnabled) {
      throw new Error(`Harnex mapping was not reviewable and complete: ${JSON.stringify(mapping)}`);
    }

    await client.evaluate(`(() => {
      const button = Array.from(document.querySelectorAll('[role="dialog"] button'))
        .find((candidate) => candidate.textContent.trim() === 'Confirm mapping');
      button?.click();
      return Boolean(button);
    })()`);

    await waitFor(
      () => client.evaluate(`document.body.textContent.includes('Categorize and review')`),
      'Harnex-assisted category Review',
      160,
    );

    const review = await client.evaluate(`(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const articles = Array.from(dialog?.querySelectorAll('article') ?? []);
      return {
        rows: articles.length,
        groceries: articles.filter((article) => article.textContent.includes('Groceries')).length,
        hasUncategorized: articles.some((article) => article.textContent.includes('Uncategorized'))
      };
    })()`);
    if (review?.rows !== 2 || review?.groceries !== 2 || review?.hasUncategorized) {
      throw new Error(`Category suggestions did not converge into Review: ${JSON.stringify(review)}`);
    }

    await client.evaluate(`(() => {
      const button = Array.from(document.querySelectorAll('[role="dialog"] button'))
        .find((candidate) => candidate.textContent.trim() === 'Review 2 transactions');
      button?.click();
      return Boolean(button);
    })()`);
    await waitFor(
      () => client.evaluate(`document.body.textContent.includes('Review before import')`),
      'Verified import confirmation',
    );

    await client.evaluate(`(() => {
      const button = Array.from(document.querySelectorAll('[role="dialog"] button'))
        .find((candidate) => candidate.textContent.trim() === 'Import 2 transactions');
      button?.click();
      return Boolean(button);
    })()`);
    await waitFor(
      () => client.evaluate(`document.body.textContent.includes('Import complete')`),
      'Verified import completion',
      160,
    );

    const committed = await client.evaluate(`(() => {
      const transactions = JSON.parse(localStorage.getItem('aura_transactions') ?? '[]');
      return transactions
        .filter((transaction) => transaction.title?.startsWith('Android assisted'))
        .map((transaction) => ({ title: transaction.title, category: transaction.category, type: transaction.type }))
        .sort((a, b) => a.title.localeCompare(b.title));
    })()`);
    if (committed?.length !== 2 || committed.some((transaction) => transaction.category !== 'Groceries')) {
      throw new Error(`Verified ledger commit did not preserve assisted Review: ${JSON.stringify(committed)}`);
    }

    const durationMs = Math.round(await client.evaluate(`performance.now() - ${started}`));
    console.log(JSON.stringify({
      result: 'PASS',
      journey: 'packaged-aura-webview-capacitor-harnex-review-commit',
      mapping,
      review,
      committed,
      durationMs,
    }, null, 2));
    console.log('AURA_HARNEX_WEBVIEW result=PASS');
  } finally {
    client.close();
    runAdb('forward', '--remove', `tcp:${devtoolsPort}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
