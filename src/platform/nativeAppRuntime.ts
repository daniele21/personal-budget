import {
  registerPlugin,
  type PluginListenerHandle,
} from '@capacitor/core';

export interface NativeAppUrlEvent {
  url: string;
}

export interface NativeAppResumeEvent {
  sequence: number;
}

export interface NativeAppRuntimePlugin {
  getPendingAppUrl(): Promise<{ url?: string }>;
  clearPendingAppUrl(): Promise<void>;
  addListener(
    eventName: 'appUrlOpen',
    listener: (event: NativeAppUrlEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'appResumed',
    listener: (event: NativeAppResumeEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const NativeAppRuntime = registerPlugin<NativeAppRuntimePlugin>(
  'NativeAppRuntime',
);
