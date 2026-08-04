import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentDetectionSettings } from '../PaymentDetectionSettings';

const mocks = vi.hoisted(() => ({
  updateSelectedApps: vi.fn(),
  setRequestedEnabled: vi.fn(),
  requestNotificationPermission: vi.fn(),
  openNotificationAccessSettings: vi.fn(),
  deleteAllCandidates: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../../../state/PaymentDetectionProvider', () => ({
  usePaymentDetection: () => ({
    status: {
      supported: true,
      requestedEnabled: false,
      selectedPackages: [],
      osPermissionGranted: false,
      listenerConnected: false,
      auraNotificationPermissionGranted: false,
    },
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
    updateSelectedApps: mocks.updateSelectedApps,
    setRequestedEnabled: mocks.setRequestedEnabled,
    requestNotificationPermission: mocks.requestNotificationPermission,
    openNotificationAccessSettings: mocks.openNotificationAccessSettings,
    deleteAllCandidates: mocks.deleteAllCandidates,
  }),
}));

vi.mock('../../Toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

describe('PaymentDetectionSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requestNotificationPermission.mockResolvedValue(true);
    mocks.openNotificationAccessSettings.mockResolvedValue(undefined);
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
