import React, { useState } from 'react';
import {
  BellRing,
  ExternalLink,
  Pause,
  Play,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';
import { Button, Switch } from '../ui';
import { useToast } from '../Toast';
import { usePaymentDetection } from '../../state/PaymentDetectionProvider';

export function PaymentDetectionSettings() {
  const {
    status,
    supportedApps,
    candidates,
    updateSelectedApps,
    setRequestedEnabled,
    requestNotificationPermission,
    openNotificationAccessSettings,
    deleteAllCandidates,
  } = usePaymentDetection();
  const { toast } = useToast();
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!status) return null;

  const installedApps = supportedApps.filter((app) => app.installed);
  const accessReady = status.osPermissionGranted;
  const enabled = status.requestedEnabled && accessReady;

  const handleDisclosureAccepted = async () => {
    setBusy(true);
    try {
      if (!status.auraNotificationPermissionGranted) {
        await requestNotificationPermission();
      }
      await openNotificationAccessSettings();
    } catch {
      toast('Android notification access could not be opened.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleSource = async (packageName: string) => {
    const selected = status.selectedPackages.includes(packageName);
    const next = selected
      ? status.selectedPackages.filter((item) => item !== packageName)
      : [...status.selectedPackages, packageName];
    try {
      await updateSelectedApps(next);
    } catch {
      toast('The selected payment apps could not be updated.', 'error');
    }
  };

  const handleToggleEnabled = async () => {
    if (!accessReady) {
      setShowDisclosure(true);
      return;
    }
    if (!status.requestedEnabled && status.selectedPackages.length === 0) {
      toast('Select a supported payment app first.', 'warning');
      return;
    }
    try {
      await setRequestedEnabled(!status.requestedEnabled);
      toast(
        status.requestedEnabled
          ? 'Payment detection paused.'
          : 'Payment detection enabled.',
        'success',
      );
    } catch {
      toast('Payment detection could not be updated.', 'error');
    }
  };

  return (
    <section
      aria-labelledby="payment-detection-settings-title"
      className="space-y-4"
    >
      <div className="flex items-start justify-between gap-4 px-1">
        <div>
          <p className="text-micro font-bold uppercase text-on-surface-variant">
            On-device detection
          </p>
          <h2
            id="payment-detection-settings-title"
            className="font-headline text-xl font-extrabold text-primary"
          >
            Detection controls
          </h2>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-micro font-extrabold ${
            enabled
              ? 'bg-secondary/10 text-secondary'
              : 'bg-surface-container-high text-on-surface-variant'
          }`}
        >
          {enabled ? 'Active' : status.requestedEnabled ? 'Access missing' : 'Paused'}
        </span>
      </div>

      <div className="divide-y divide-outline-variant/20 overflow-hidden rounded-3xl border border-outline-variant/15 bg-surface-container-lowest">
        <div className="flex items-start gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-on-surface">
              Android notification access
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
              Android grants access to notifications generally. Aura filters
              locally and reads content only from supported apps you select.
            </p>
          </div>
          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
            accessReady ? 'bg-secondary' : 'bg-tertiary'
          }`} aria-label={accessReady ? 'Granted' : 'Not granted'} />
        </div>

        <div className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-on-surface">Payment apps</p>
              <p className="text-xs text-on-surface-variant">
                Only installed and explicitly selected sources are processed.
              </p>
            </div>
          </div>

          {installedApps.length === 0 ? (
            <p className="rounded-2xl bg-surface-container-low p-3 text-xs leading-relaxed text-on-surface-variant">
              No supported payment app is installed. The controlled test
              source appears here only while the emulator simulation is active.
            </p>
          ) : (
            <div className="space-y-1">
              {installedApps.map((app) => (
                <div
                  key={app.id}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-2xl px-3 py-2 hover:bg-surface-container-low"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-on-surface">
                      {app.displayName}
                    </p>
                    {app.syntheticOnly && (
                      <p className="text-micro font-bold uppercase text-on-surface-variant">
                        Controlled test source
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={status.selectedPackages.includes(app.packageName)}
                    onChange={() => void handleToggleSource(app.packageName)}
                    label={`${status.selectedPackages.includes(app.packageName) ? 'Stop monitoring' : 'Monitor'} ${app.displayName}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          variant={status.requestedEnabled ? 'secondary' : 'primary'}
          onClick={() => void handleToggleEnabled()}
          disabled={busy}
          fullWidth
        >
          {status.requestedEnabled ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          {status.requestedEnabled ? 'Pause detection' : 'Enable detection'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowDisclosure(true)}
          disabled={busy}
          fullWidth
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Android access
        </Button>
      </div>

      {candidates.length > 0 && (
        <button
          type="button"
          onClick={() => setShowDelete(true)}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-tertiary transition-colors hover:bg-tertiary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary/30"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete all pending candidates
        </button>
      )}

      <ConfirmDialog
        isOpen={showDisclosure}
        title="Allow payment detection?"
        message="Android grants Aura broad notification access at the system level. Aura applies a local filter before reading content, processes only supported apps you explicitly select, stores pending candidates only on this device, and never creates a transaction without your confirmation."
        confirmLabel="Continue to Android"
        cancelLabel="Not now"
        onCancel={() => setShowDisclosure(false)}
        onConfirm={() => void handleDisclosureAccepted()}
      />

      <ConfirmDialog
        isOpen={showDelete}
        title="Delete pending payments?"
        message="This permanently removes every pending candidate and its local deduplication record. Existing Aura transactions are not affected."
        confirmLabel="Delete candidates"
        cancelLabel="Keep them"
        variant="danger"
        onCancel={() => setShowDelete(false)}
        onConfirm={() => {
          void deleteAllCandidates()
            .then((count) => toast(`${count} pending candidates deleted.`, 'success'))
            .catch(() => toast('Pending candidates could not be deleted.', 'error'));
        }}
      />
    </section>
  );
}
