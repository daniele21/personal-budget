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
    supportedApps: [{
      id: 'aura-synthetic-source',
      packageName: 'com.staituned.aura.syntheticnotifications',
      displayName: 'Aura controlled test source',
      syntheticOnly: true,
      installed: true,
    }],
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
});
