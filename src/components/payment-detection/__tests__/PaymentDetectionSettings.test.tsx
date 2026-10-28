import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentDetectionSettings } from '../PaymentDetectionSettings';

const mocks = vi.hoisted(() => ({
  status: {
    supported: true,
    requestedEnabled: false,
    selectedPackages: [] as string[],
    osPermissionGranted: false,
    listenerConnected: false,
    listenerAccessUpgradeRequired: false,
    auraNotificationPermissionGranted: false,
    candidateNotificationsEnabled: false,
  },
  refresh: vi.fn(),
  refreshDiagnostics: vi.fn(),
  diagnosticsError: null as string | null,
  updateSelectedApps: vi.fn(),
  setRequestedEnabled: vi.fn(),
  requestNotificationPermission: vi.fn(),
  openNotificationAccessSettings: vi.fn(),
  repairNotificationListener: vi.fn(),
  openPaymentAlertSettings: vi.fn(),
  deleteAllCandidates: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../../../state/PaymentDetectionProvider', () => ({
  usePaymentDetection: () => ({
    status: mocks.status,
    supportedApps: [
      {
        id: 'aura-synthetic-source',
        packageName: 'com.staituned.aura.syntheticnotifications',
        displayName: 'Aura controlled test source',
        syntheticOnly: true,
        installed: true,
      },
      {
        id: 'intesa-sanpaolo-mobile',
        packageName: 'com.latuabancaperandroid',
        displayName: 'Intesa Sanpaolo Mobile',
        syntheticOnly: false,
        installed: true,
      },
      {
        id: 'google-wallet',
        packageName: 'com.google.android.apps.walletnfcrel',
        displayName: 'Google Wallet',
        syntheticOnly: false,
        installed: true,
      },
      {
        id: 'paypal',
        packageName: 'com.paypal.android.p2pmobile',
        displayName: 'PayPal',
        syntheticOnly: false,
        installed: true,
      },
    ],
    candidates: [{ id: 'candidate' }],
    refresh: mocks.refresh,
    refreshDiagnostics: mocks.refreshDiagnostics,
    diagnosticsUpdatedAt: Date.UTC(2026, 9, 28),
    diagnosticsError: mocks.diagnosticsError,
    updateSelectedApps: mocks.updateSelectedApps,
    setRequestedEnabled: mocks.setRequestedEnabled,
    requestNotificationPermission: mocks.requestNotificationPermission,
    openNotificationAccessSettings: mocks.openNotificationAccessSettings,
    repairNotificationListener: mocks.repairNotificationListener,
    openPaymentAlertSettings: mocks.openPaymentAlertSettings,
    deleteAllCandidates: mocks.deleteAllCandidates,
  }),
}));

vi.mock('../../Toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

describe('PaymentDetectionSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mocks.status, {
      supported: true,
      requestedEnabled: false,
      selectedPackages: [],
      osPermissionGranted: false,
      listenerConnected: false,
      listenerAccessUpgradeRequired: false,
      auraNotificationPermissionGranted: false,
      candidateNotificationsEnabled: false,
    });
    delete (mocks.status as typeof mocks.status & { diagnostics?: unknown }).diagnostics;
    mocks.refresh.mockResolvedValue(undefined);
    mocks.refreshDiagnostics.mockResolvedValue(undefined);
    mocks.diagnosticsError = null;
    mocks.requestNotificationPermission.mockResolvedValue(true);
    mocks.openNotificationAccessSettings.mockResolvedValue(undefined);
    mocks.repairNotificationListener.mockResolvedValue(undefined);
    mocks.openPaymentAlertSettings.mockResolvedValue(undefined);
    mocks.updateSelectedApps.mockResolvedValue(undefined);
  });

  it('requires prominent disclosure before opening broad Android access', async () => {
    const user = userEvent.setup();
    render(<PaymentDetectionSettings />);

    await user.click(screen.getByRole('button', { name: 'Android access' }));

    expect(screen.getByRole('dialog', { name: 'Allow payment detection?' }))
      .toHaveTextContent(/app source, title, text, and time/);
    expect(screen.getByRole('dialog', { name: 'Allow payment detection?' }))
      .toHaveTextContent(/does not send payment candidates off this device/);
    expect(mocks.openNotificationAccessSettings).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Agree and continue' }));

    await vi.waitFor(() => {
      expect(mocks.requestNotificationPermission).toHaveBeenCalledOnce();
      expect(mocks.openNotificationAccessSettings).toHaveBeenCalledOnce();
    });
  });

  it('shows reconnecting instead of active when Android access exists but the listener is disconnected', () => {
    Object.assign(mocks.status, {
      requestedEnabled: true,
      selectedPackages: ['com.google.android.apps.walletnfcrel'],
      osPermissionGranted: true,
      listenerConnected: false,
      auraNotificationPermissionGranted: true,
      candidateNotificationsEnabled: true,
    });

    render(<PaymentDetectionSettings />);

    expect(screen.getByText('Reconnecting')).toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.getByText(/listener is reconnecting/i)).toBeInTheDocument();
  });

  it('surfaces a blocked Aura payment-alert channel separately from listener health', async () => {
    Object.assign(mocks.status, {
      requestedEnabled: true,
      selectedPackages: ['com.google.android.apps.walletnfcrel'],
      osPermissionGranted: true,
      listenerConnected: true,
      auraNotificationPermissionGranted: true,
      candidateNotificationsEnabled: false,
    });
    const user = userEvent.setup();

    render(<PaymentDetectionSettings />);

    expect(screen.getByText('Alerts blocked')).toBeInTheDocument();
    expect(screen.getByText(/no Aura alert will appear/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open payment alert settings' }));
    expect(mocks.openPaymentAlertSettings).toHaveBeenCalledOnce();
  });

  it('offers Android access repair while a granted listener is reconnecting', async () => {
    Object.assign(mocks.status, {
      requestedEnabled: true,
      selectedPackages: ['com.google.android.apps.walletnfcrel'],
      osPermissionGranted: true,
      listenerConnected: false,
      auraNotificationPermissionGranted: true,
      candidateNotificationsEnabled: true,
    });
    const user = userEvent.setup();

    render(<PaymentDetectionSettings />);
    await user.click(screen.getByRole('button', { name: 'Repair listener now' }));

    expect(mocks.repairNotificationListener).toHaveBeenCalledOnce();
    expect(mocks.openNotificationAccessSettings).not.toHaveBeenCalled();
  });

  it('requires a one-time V2 listener upgrade for legacy Android grants', async () => {
    Object.assign(mocks.status, {
      requestedEnabled: true,
      selectedPackages: ['com.google.android.apps.walletnfcrel'],
      osPermissionGranted: true,
      listenerConnected: true,
      listenerAccessUpgradeRequired: true,
      auraNotificationPermissionGranted: true,
      candidateNotificationsEnabled: true,
    });
    const user = userEvent.setup();

    render(<PaymentDetectionSettings />);

    expect(screen.getByText('Access upgrade needed')).toBeInTheDocument();
    expect(screen.getByText(/legacy Android listener/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Upgrade Android access' }));

    expect(mocks.repairNotificationListener).toHaveBeenCalledOnce();
  });

  it('does not claim Active when no source is selected', () => {
    Object.assign(mocks.status, {
      requestedEnabled: true,
      selectedPackages: [],
      osPermissionGranted: true,
      listenerConnected: true,
      auraNotificationPermissionGranted: true,
      candidateNotificationsEnabled: true,
    });

    render(<PaymentDetectionSettings />);

    expect(screen.getByText('No apps selected')).toBeInTheDocument();
    expect(screen.getByText(/No payment sources are selected/)).toBeInTheDocument();
    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });

  it('labels a bound listener Connected rather than claiming payment reception', async () => {
    Object.assign(mocks.status, {
      requestedEnabled: true,
      selectedPackages: ['com.google.android.apps.walletnfcrel'],
      osPermissionGranted: true,
      listenerConnected: true,
      listenerAccessUpgradeRequired: false,
      auraNotificationPermissionGranted: true,
      candidateNotificationsEnabled: true,
      diagnostics: {
        supportedCallbacksObserved: 3,
        callbacksRejectedWrongGeneration: 0,
        callbacksRejectedBySettings: 1,
        activeSnapshotReads: 2,
        activeSnapshotFailures: 0,
        activeSupportedNotifications: 2,
        activeSelectedNotifications: 1,
        selectedCallbacks: 2,
        activeNotificationReplays: 0,
        processedEnvelopes: 2,
        exactMatches: 1,
        reviewMatches: 0,
        ignoredMatches: 1,
        createdCandidates: 1,
        updatedCandidates: 0,
        suppressedDuplicates: 0,
        postedAlerts: 1,
        failedAlerts: 0,
        processingFailures: 0,
      },
    });

    render(<PaymentDetectionSettings />);

    expect(screen.getByText('Bound · unverified')).toBeInTheDocument();
    expect(screen.getByText(/does not confirm/)).toBeInTheDocument();
    expect(screen.getByText('Local detector diagnostics')).toBeInTheDocument();
    expect(screen.getByText('Selected Android callbacks')).toBeInTheDocument();
    expect(screen.getByText('Supported-app callbacks before Aura filters')).toBeInTheDocument();
    expect(screen.getByText('Rejected: account or source selection')).toBeInTheDocument();
    expect(screen.getByText('Supported notifications visible in snapshots')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByText('Local detector diagnostics'));
    await user.click(screen.getByRole('button', { name: 'Refresh diagnostics' }));
    expect(mocks.refreshDiagnostics).toHaveBeenCalledOnce();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it('marks a failed status refresh as stale rather than claiming connected', () => {
    Object.assign(mocks.status, {
      requestedEnabled: true,
      selectedPackages: ['com.google.android.apps.walletnfcrel'],
      osPermissionGranted: true,
      listenerConnected: true,
      auraNotificationPermissionGranted: true,
      candidateNotificationsEnabled: true,
      diagnostics: {
        supportedCallbacksObserved: 0, activeSnapshotReads: 0,
        recoveryAttempts: 1, lastRecoveryResult: 'SETTINGS_FAILURE',
      },
    });
    mocks.diagnosticsError = 'Native status unavailable';
    render(<PaymentDetectionSettings />);
    expect(screen.getByText('Status stale')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/counters below may be stale/i);
  });

  it('offers explicit repair even when Android still reports the V2 listener connected', async () => {
    Object.assign(mocks.status, {
      requestedEnabled: true,
      selectedPackages: ['com.google.android.apps.walletnfcrel'],
      osPermissionGranted: true,
      listenerConnected: true,
      listenerAccessUpgradeRequired: false,
      auraNotificationPermissionGranted: true,
      candidateNotificationsEnabled: true,
    });
    const user = userEvent.setup();

    render(<PaymentDetectionSettings />);
    await user.click(screen.getByRole('button', { name: 'Repair listener' }));

    expect(mocks.repairNotificationListener).toHaveBeenCalledOnce();
  });

  it('keeps source selection as a separate affirmative control', async () => {
    const user = userEvent.setup();
    render(<PaymentDetectionSettings />);

    await user.click(screen.getByRole('switch', {
      name: 'Monitor Aura controlled test source',
    }));

    expect(mocks.updateSelectedApps).toHaveBeenCalledWith([
      'com.staituned.aura.syntheticnotifications',
    ]);
  });

  it('shows and explicitly selects the installed Intesa source', async () => {
    const user = userEvent.setup();
    render(<PaymentDetectionSettings />);

    expect(screen.getByText('Intesa Sanpaolo Mobile')).toBeInTheDocument();
    await user.click(screen.getByRole('switch', {
      name: 'Monitor Intesa Sanpaolo Mobile',
    }));

    expect(mocks.updateSelectedApps).toHaveBeenCalledWith([
      'com.latuabancaperandroid',
    ]);
  });

  it('shows and explicitly selects the installed Google Wallet source', async () => {
    const user = userEvent.setup();
    render(<PaymentDetectionSettings />);

    expect(screen.getByText('Google Wallet')).toBeInTheDocument();
    await user.click(screen.getByRole('switch', {
      name: 'Monitor Google Wallet',
    }));

    expect(mocks.updateSelectedApps).toHaveBeenCalledWith([
      'com.google.android.apps.walletnfcrel',
    ]);
  });

  it('shows and explicitly selects the installed PayPal source', async () => {
    const user = userEvent.setup();
    render(<PaymentDetectionSettings />);

    expect(screen.getByText('PayPal')).toBeInTheDocument();
    await user.click(screen.getByRole('switch', {
      name: 'Monitor PayPal',
    }));

    expect(mocks.updateSelectedApps).toHaveBeenCalledWith([
      'com.paypal.android.p2pmobile',
    ]);
  });
});
