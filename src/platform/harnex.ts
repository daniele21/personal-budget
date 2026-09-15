import { registerPlugin } from '@capacitor/core';
import {
  recordImportV2Diagnostic,
} from '../lib/importV2Diagnostics';
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

export type HarnexHostLaunchResult =
  | { status: 'opened' }
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
  openHostApp(): Promise<HarnexHostLaunchResult>;
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

function platformFailure(): HarnexFailure {
  return {
    code: 'PLATFORM_UNSUPPORTED',
    message: 'Local Harnex assistance is available only in Aura for Android.',
  };
}

export async function openHarnexHostApp(
  capabilitiesProvider: () => PlatformCapabilities = getPlatformCapabilities,
  nativePlugin: NativeHarnexPlugin = NativeHarnex,
): Promise<HarnexHostLaunchResult> {
  if (!capabilitiesProvider().harnexSupported) {
    return { status: 'unavailable', failure: platformFailure() };
  }
  return nativePlugin.openHostApp();
}

export function createHarnexClient(
  capabilitiesProvider: () => PlatformCapabilities = getPlatformCapabilities,
  nativePlugin: NativeHarnexPlugin = NativeHarnex,
): HarnexClient {
  return {
    async connect() {
      if (!capabilitiesProvider().harnexSupported) {
        const result = { status: 'unavailable', failure: platformFailure() } as const;
        recordImportV2Diagnostic('harnex-connect', 'unavailable', {
          failureCode: result.failure.code,
        });
        return result;
      }

      recordImportV2Diagnostic('harnex-connect', 'started');
      try {
        const result = await nativePlugin.connect();
        recordImportV2Diagnostic('harnex-connect', result.status, result.status === 'unavailable'
          ? { failureCode: result.failure.code }
          : {});
        return result;
      } catch (error) {
        recordImportV2Diagnostic('harnex-connect', 'threw', { reasonCode: 'native-exception' });
        throw error;
      }
    },

    async probe(useCaseId) {
      if (!capabilitiesProvider().harnexSupported) {
        const result = { status: 'unavailable', failure: platformFailure() } as const;
        recordImportV2Diagnostic('harnex-probe', 'unavailable', {
          useCaseId,
          failureCode: result.failure.code,
        });
        return result;
      }

      recordImportV2Diagnostic('harnex-probe', 'started', { useCaseId });
      try {
        const result = await nativePlugin.probe({ useCaseId });
        recordImportV2Diagnostic('harnex-probe', result.status, result.status === 'available'
          ? {
              useCaseId,
              maxInputCharacters: result.maxInputCharacters,
              maxJsonSchemaCharacters: result.maxJsonSchemaCharacters,
            }
          : { useCaseId, failureCode: result.failure.code });
        return result;
      } catch (error) {
        recordImportV2Diagnostic('harnex-probe', 'threw', {
          useCaseId,
          reasonCode: 'native-exception',
        });
        throw error;
      }
    },

    async generate(request) {
      const requestDetails = {
        useCaseId: request.useCaseId,
        inputCharacters: request.input.length,
        jsonSchemaCharacters: request.jsonSchema.length,
      };
      if (!capabilitiesProvider().harnexSupported) {
        const result = { status: 'failed', failure: platformFailure() } as const;
        recordImportV2Diagnostic('harnex-generate', 'failed', {
          ...requestDetails,
          failureCode: result.failure.code,
        });
        return result;
      }

      recordImportV2Diagnostic('harnex-generate', 'started', requestDetails);
      try {
        const result = await nativePlugin.generate(request);
        recordImportV2Diagnostic('harnex-generate', result.status, result.status === 'completed'
          ? {
              ...requestDetails,
              totalMs: result.metrics.totalMs,
              ...(result.metrics.outputTokens != null ? { outputTokens: result.metrics.outputTokens } : {}),
            }
          : { ...requestDetails, failureCode: result.failure.code });
        return result;
      } catch (error) {
        recordImportV2Diagnostic('harnex-generate', 'threw', {
          ...requestDetails,
          reasonCode: 'native-exception',
        });
        throw error;
      }
    },

    async cancel() {
      if (!capabilitiesProvider().harnexSupported) {
        recordImportV2Diagnostic('harnex-cancel', 'not-supported');
        return { cancelled: false };
      }
      try {
        const result = await nativePlugin.cancel();
        recordImportV2Diagnostic('harnex-cancel', result.cancelled ? 'cancelled' : 'idle');
        return result;
      } catch (error) {
        recordImportV2Diagnostic('harnex-cancel', 'threw', { reasonCode: 'native-exception' });
        throw error;
      }
    },

    async disconnect() {
      if (!capabilitiesProvider().harnexSupported) {
        recordImportV2Diagnostic('harnex-disconnect', 'disconnected');
        return { status: 'disconnected' };
      }
      recordImportV2Diagnostic('harnex-disconnect', 'started');
      try {
        const result = await nativePlugin.disconnect();
        recordImportV2Diagnostic('harnex-disconnect', result.status, result.status === 'failed'
          ? { failureCode: result.failure.code }
          : {});
        return result;
      } catch (error) {
        recordImportV2Diagnostic('harnex-disconnect', 'threw', { reasonCode: 'native-exception' });
        throw error;
      }
    },
  };
}

export const harnexClient = createHarnexClient();
