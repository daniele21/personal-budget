import { Cloud, LoaderCircle, WifiOff } from 'lucide-react';
import { Button } from './ui/Button';

interface FirstRunStatusDialogProps {
  hasTimedOut: boolean;
  onContinueOffline: () => void;
}

export function FirstRunStatusDialog({ hasTimedOut, onContinueOffline }: FirstRunStatusDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[154] flex items-end justify-center bg-black/50 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-check-title"
      aria-describedby="backup-check-description"
    >
      <div className="w-full max-w-md rounded-t-3xl bg-surface-container-lowest p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {hasTimedOut ? <WifiOff className="h-5 w-5" /> : <Cloud className="h-5 w-5" />}
          </span>
          <div>
            <h2 id="backup-check-title" className="font-headline text-lg font-extrabold text-on-surface">
              {hasTimedOut ? 'Cloud check is taking longer' : 'Checking for your backup'}
            </h2>
            <p id="backup-check-description" className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              {hasTimedOut
                ? 'You can retry by staying here, or continue offline. Aura will not overwrite a cloud backup from an empty workspace.'
                : 'Aura checks for encrypted recovery versions before asking how you want to start.'}
            </p>
          </div>
        </div>
        {hasTimedOut ? (
          <Button type="button" fullWidth className="mt-5" onClick={onContinueOffline}>
            Continue offline
          </Button>
        ) : (
          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-on-surface-variant" aria-live="polite">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Checking encrypted versions…
          </div>
        )}
      </div>
    </div>
  );
}

