import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativePaymentDetectionStatus {
  supported: boolean;
  requestedEnabled: boolean;
  osPermissionGranted: boolean;
  listenerConnected: boolean;
  auraNotificationPermissionGranted: boolean;
  selectedPackages: string[];
}

export interface NativeSupportedPaymentApp {
  id: string;
  packageName: string;
  displayName: string;
  syntheticOnly: boolean;
}

interface NativePaymentDetectionSettingsPlugin {
  getStatus(): Promise<NativePaymentDetectionStatus>;
  listSupportedApps(): Promise<{ apps: NativeSupportedPaymentApp[] }>;
  updateSettings(options: {
    requestedEnabled: boolean;
    selectedPackages: string[];
  }): Promise<NativePaymentDetectionStatus>;
  openNotificationAccessSettings(): Promise<void>;
  requestAuraNotificationPermission(): Promise<{ granted: boolean }>;
}

const PaymentDetection =
  registerPlugin<NativePaymentDetectionSettingsPlugin>('PaymentDetection');

function requireAndroidPlugin(): NativePaymentDetectionSettingsPlugin {
  if (
    Capacitor.getPlatform() !== 'android' ||
    !Capacitor.isPluginAvailable('PaymentDetection')
  ) {
    throw new Error('Payment detection settings are available only on Android.');
  }
  return PaymentDetection;
}

export const paymentDetectionSettings = {
  async getStatus(): Promise<NativePaymentDetectionStatus> {
    return await requireAndroidPlugin().getStatus();
  },

  async listSupportedApps(): Promise<{ apps: NativeSupportedPaymentApp[] }> {
    return await requireAndroidPlugin().listSupportedApps();
  },

  async updateSettings(options: {
    requestedEnabled: boolean;
    selectedPackages: string[];
  }): Promise<NativePaymentDetectionStatus> {
    return await requireAndroidPlugin().updateSettings(options);
  },

  async openNotificationAccessSettings(): Promise<void> {
    await requireAndroidPlugin().openNotificationAccessSettings();
  },

  async requestAuraNotificationPermission(): Promise<{ granted: boolean }> {
    return await requireAndroidPlugin().requestAuraNotificationPermission();
  },
};
