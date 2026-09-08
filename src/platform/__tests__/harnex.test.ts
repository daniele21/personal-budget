import { describe, expect, it, vi } from 'vitest';
import {
  createHarnexClient,
  HARNEX_SCHEMA_INFERENCE_USE_CASE,
  type NativeHarnexPlugin,
} from '../harnex';
import { resolvePlatformCapabilities } from '../platformCapabilities';

function nativePlugin(): NativeHarnexPlugin {
  return {
    connect: vi.fn(async () => ({ status: 'connected' as const })),
    probe: vi.fn(async () => ({
      status: 'available' as const,
      maxInputCharacters: 12_000,
      maxJsonSchemaCharacters: 4_096,
    })),
    generate: vi.fn(async () => ({
      status: 'completed' as const,
      answer: '{"status":"resolved"}',
      metrics: { totalMs: 12 },
    })),
    cancel: vi.fn(async () => ({ cancelled: true })),
    disconnect: vi.fn(async () => ({ status: 'disconnected' as const })),
  };
}

describe('createHarnexClient', () => {
  it('fails closed in the browser harness without invoking the native plugin', async () => {
    const native = nativePlugin();
    const client = createHarnexClient(
      () => resolvePlatformCapabilities('web'),
      native,
    );

    await expect(client.connect()).resolves.toMatchObject({
      status: 'unavailable',
      failure: { code: 'PLATFORM_UNSUPPORTED' },
    });
    await expect(client.probe(HARNEX_SCHEMA_INFERENCE_USE_CASE)).resolves.toMatchObject({
      status: 'unavailable',
      failure: { code: 'PLATFORM_UNSUPPORTED' },
    });
    await expect(
      client.generate({
        useCaseId: HARNEX_SCHEMA_INFERENCE_USE_CASE,
        input: '{}',
        jsonSchema: '{}',
      }),
    ).resolves.toMatchObject({
      status: 'failed',
      failure: { code: 'PLATFORM_UNSUPPORTED' },
    });
    await expect(client.cancel()).resolves.toEqual({ cancelled: false });
    await expect(client.disconnect()).resolves.toEqual({ status: 'disconnected' });

    expect(native.connect).not.toHaveBeenCalled();
    expect(native.probe).not.toHaveBeenCalled();
    expect(native.generate).not.toHaveBeenCalled();
    expect(native.cancel).not.toHaveBeenCalled();
    expect(native.disconnect).not.toHaveBeenCalled();
  });

  it('forwards Android calls through the typed native boundary', async () => {
    const native = nativePlugin();
    const client = createHarnexClient(
      () => resolvePlatformCapabilities('android'),
      native,
    );

    await expect(client.connect()).resolves.toEqual({ status: 'connected' });
    await expect(client.probe(HARNEX_SCHEMA_INFERENCE_USE_CASE)).resolves.toMatchObject({
      status: 'available',
      maxInputCharacters: 12_000,
    });
    await expect(
      client.generate({
        useCaseId: HARNEX_SCHEMA_INFERENCE_USE_CASE,
        input: '{"columns":[]}',
        jsonSchema: '{"type":"object"}',
      }),
    ).resolves.toMatchObject({ status: 'completed' });
    await expect(client.cancel()).resolves.toEqual({ cancelled: true });
    await expect(client.disconnect()).resolves.toEqual({ status: 'disconnected' });

    expect(native.probe).toHaveBeenCalledWith({
      useCaseId: HARNEX_SCHEMA_INFERENCE_USE_CASE,
    });
  });
});
