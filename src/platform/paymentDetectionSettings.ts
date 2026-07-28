import {
  paymentDetection,
  type NativePaymentDetectionStatus,
  type NativeSupportedPaymentApp,
} from './paymentDetection';

export type { NativePaymentDetectionStatus, NativeSupportedPaymentApp };

export const paymentDetectionSettings = {
  async getStatus(): Promise<NativePaymentDetectionStatus> {
    return await paymentDetection.getStatus();
  },

  async listSupportedApps(): Promise<{ apps: NativeSupportedPaymentApp[] }> {
    return await paymentDetection.listSupportedApps();
  },

  async updateSettings(options: {
    requestedEnabled: boolean;
    selectedPackages: string[];
  }): Promise<NativePaymentDetectionStatus> {
    return await paymentDetection.updateSettings(options);
  },

  async openNotificationAccessSettings(): Promise<void> {
    await paymentDetection.openNotificationAccessSettings();
  },

  async requestAuraNotificationPermission(): Promise<{ granted: boolean }> {
    return await paymentDetection.requestAuraNotificationPermission();
  },
};
