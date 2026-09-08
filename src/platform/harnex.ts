import { registerPlugin } from '@capacitor/core';
import {
  getPlatformCapabilities,
  type PlatformCapabilities,
} from './platformCapabilities';

export const HARNEX_SCHEMA_INFERENCE_USE_CASE =
  'aura-transaction-schema-inference' as const;
export const HARNEX_CATEGORY_CLASSIFICATION_USE_CASE =
  'aura-transaction-category-classification' as const;

export type HarnexUseCaseId =
  | typeof HARNEX_SCHEMA_INFERENCE_USE_CASE
  | typeof HARNEX_CATEGORY_CLASSIFICATION_USE_CASE;

export type HarnexFailureCode =
  | 'PLATFORM_UNSUPPORTED'
  | 'HOST_NOT_INSTALLED'
  | 'UNAUTHORIZED'
  | 'INCOMPATIBLE'
  | 'CONNECTION_LOST'
  | 'CONNECTION_TIMEOUT'
  | 'USE_CASE_NOT_ASSIGNED'
  | 'USE_CASE_UNAVAILABLE'
  | 'MODEL_UNAVAILABLE'
  | 'CAPABILITY_CHANGED'
  | 'INVALID_REQUEST'
  | 'BUSY'
  | 'CANCELLED'
  | 'RUNTIME_FAILURE';

export interface HarnexFailure {
  code: HarnexFailureCode;
  message: string;
}

export type HarnexConnectionResult =
  | { status: 'connected' }
  | { status: 'unavailable'; failure: HarnexFailure };

export type HarnexCapabilityResult =
  | {
      status: 'available';
      maxInputCharacters: number;
      maxJsonSchemaCharacters: number;
    }
  | { status: 'unavailable'; failure: HarnexFailure };

export interface HarnexGenerationRequest {
  useCaseId: HarnexUseCaseId;
  input: string;
  jsonSchema: string;
}

export interface HarnexGenerationMetrics {
  totalMs: number;
  timeToFirstTokenMs?: number;
  outputTokens?: number;
  decodeTokensPerSecond?: number;
}

export type HarnexGenerationResult =
  | {
      status: 'completed';
      answer: string;
      metrics: HarnexGenerationMetrics;
    }
  | { status: 'failed'; failure: HarnexFailure };

export type HarnexDisconnectResult =
  | { status: 'disconnected' }
  | { status: 'failed'; failure: HarnexFailure };

export interface NativeHarnexPlugin {
  connect(): Promise<HarnexConnectionResult>;
  probe(options: { useCaseId: HarnexUseCaseId }): Promise<HarnexCapabilityResult>;
  generate(options: HarnexGenerationRequest): Promise<HarnexGenerationResult>;
  cancel(): Promise<{ cancelled: boolean }>;
  disconnect(): Promise<HarnexDisconnectResult>;
}

export interface HarnexClient {
  connect(): Promise<HarnexConnectionResult>;
  probe(useCaseId: HarnexUseCaseId): Promise<HarnexCapabilityResult>;
  generate(request: HarnexGenerationRequest): Promise<HarnexGenerationResult>;
  cancel(): Promise<{ cancelled: boolean }>;
  disconnect(): Promise<HarnexDisconnectResult>;
}

const NativeHarnex = registerPlugin<NativeHarnexPlugin>('NativeHarnex');

export function createHarnexClient(
  capabilitiesProvider: () => PlatformCapabilities = getPlatformCapabilities,
  nativePlugin: NativeHarnexPlugin = NativeHarnex,
): HarnexClient {
  const platformFailure = (): HarnexFailure => ({
    code: 'PLATFORM_UNSUPPORTED',
    message: 'Local Harnex assistance is available only in Aura for Android.',
  });

  return {
    async connect() {
      if (!capabilitiesProvider().harnexSupported) {
        return { status: 'unavailable', failure: platformFailure() };
      }
      return nativePlugin.connect();
    },

    async probe(useCaseId) {
      if (!capabilitiesProvider().harnexSupported) {
        return { status: 'unavailable', failure: platformFailure() };
      }
      return nativePlugin.probe({ useCaseId });
    },

    async generate(request) {
      if (!capabilitiesProvider().harnexSupported) {
        return { status: 'failed', failure: platformFailure() };
      }
      return nativePlugin.generate(request);
    },

    async cancel() {
      if (!capabilitiesProvider().harnexSupported) {
        return { cancelled: false };
      }
      return nativePlugin.cancel();
    },

    async disconnect() {
      if (!capabilitiesProvider().harnexSupported) {
        return { status: 'disconnected' };
      }
      return nativePlugin.disconnect();
    },
  };
}

export const harnexClient = createHarnexClient();
