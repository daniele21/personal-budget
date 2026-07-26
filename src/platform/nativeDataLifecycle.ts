import { Capacitor, registerPlugin } from '@capacitor/core';

export type NativeDataPurgeReason =
  | 'logout'
  | 'account_change'
  | 'local_reset'
  | 'total_deletion';

interface NativePaymentDetectionLifecyclePlugin {
  registerOwner(options: { firebaseUid: string }): Promise<void>;
  purgeForLogoutOrReset(options: {
    reason: NativeDataPurgeReason;
  }): Promise<void>;
}

const NativePaymentDetectionLifecycle =
  registerPlugin<NativePaymentDetectionLifecyclePlugin>('PaymentDetection');

/**
 * Coordinates account and deletion boundaries with the future native candidate
 * repository. It is intentionally a no-op until the PaymentDetection plugin is
 * installed, so M1-M2 remain usable without advertising the feature.
 */
export async function purgeNativePaymentData(
  reason: NativeDataPurgeReason,
): Promise<void> {
  if (
    !Capacitor.isNativePlatform() ||
    !Capacitor.isPluginAvailable('PaymentDetection')
  ) {
    return;
  }
  await NativePaymentDetectionLifecycle.purgeForLogoutOrReset({ reason });
}

export async function registerNativePaymentOwner(
  firebaseUid: string,
): Promise<void> {
  if (
    !Capacitor.isNativePlatform() ||
    !Capacitor.isPluginAvailable('PaymentDetection')
  ) {
    return;
  }
  await NativePaymentDetectionLifecycle.registerOwner({ firebaseUid });
}
