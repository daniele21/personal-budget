import { useEffect, useState, type ReactNode } from 'react';
import { recoverInterruptedRestore } from '../../services/archive/restoreService';

type RecoveryState = 'recovering' | 'ready' | 'failed';

export function RestoreRecoveryGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RecoveryState>('recovering');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState('recovering');
    recoverInterruptedRestore().then(
      () => active && setState('ready'),
      () => active && setState('failed'),
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  if (state === 'ready') return children;

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">
          {state === 'recovering' ? 'Recovering Aura data…' : 'Aura recovery needs attention'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {state === 'recovering'
            ? 'Please keep this page open while Aura verifies your local data.'
            : 'Aura paused startup to avoid loading partially restored data. Your recovery journal was preserved.'}
        </p>
        {state === 'failed' && (
          <button
            type="button"
            className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry recovery
          </button>
        )}
      </section>
    </main>
  );
}
