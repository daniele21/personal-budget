import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  beginImportV2DiagnosticAttempt,
  getImportV2Diagnostics,
  resetImportV2DiagnosticsForTests,
} from '../../lib/importV2Diagnostics';
import {
  createHarnexClient,
  HARNEX_SCHEMA_INFERENCE_USE_CASE,
  type NativeHarnexPlugin,
} from '../harnex';
import { resolvePlatformCapabilities } from '../platformCapabilities';

function nativePlugin(): NativeHarnexPlugin {
  return {
    connect: vi.fn(async () => ({ status: 'connected' as const })),
    openHostApp: vi.fn(async () => ({ status: 'opened' as const })),
    probe: vi.fn(async () => ({
      status: 'available' as const,
      maxInputCharacters: 12_000,
      maxJsonSchemaCharacters: 4_096,
    })),
    generate: vi.fn(async () => ({
      status: 'completed' as const,
      answer: '{"status":"unsupported"}',
      metrics: { totalMs: 23, outputTokens: 4 },
    })),
    cancel: vi.fn(async () => ({ cancelled: true })),
    disconnect: vi.fn(async () => ({ status: 'disconnected' as const })),
  };
}

describe('Harnex import diagnostics', () => {
  beforeEach(() => {
    resetImportV2DiagnosticsForTests();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records lifecycle stage, sizes, limits and timing without request or output content', async () => {
    beginImportV2DiagnosticAttempt('csv');
    const native = nativePlugin();
    const client = createHarnexClient(() => resolvePlatformCapabilities('android'), native);
    const input = '{"secret":"SENSITIVE-INPUT"}';
    const jsonSchema = '{"type":"object","description":"SENSITIVE-SCHEMA"}';

    await client.connect();
    await client.probe(HARNEX_SCHEMA_INFERENCE_USE_CASE);
    await client.generate({
      useCaseId: HARNEX_SCHEMA_INFERENCE_USE_CASE,
      input,
      jsonSchema,
    });
    await client.disconnect();

    const diagnostics = getImportV2Diagnostics();
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ stage: 'harnex-connect', result: 'connected' }),
      expect.objectContaining({
        stage: 'harnex-probe',
        result: 'available',
        details: expect.objectContaining({
          useCaseId: HARNEX_SCHEMA_INFERENCE_USE_CASE,
          maxInputCharacters: 12_000,
          maxJsonSchemaCharacters: 4_096,
        }),
      }),
      expect.objectContaining({
        stage: 'harnex-generate',
        result: 'completed',
        details: expect.objectContaining({
          inputCharacters: input.length,
          jsonSchemaCharacters: jsonSchema.length,
          totalMs: 23,
          outputTokens: 4,
        }),
      }),
      expect.objectContaining({ stage: 'harnex-disconnect', result: 'disconnected' }),
    ]));

    const serialized = JSON.stringify(diagnostics);
    expect(serialized).not.toContain('SENSITIVE-INPUT');
    expect(serialized).not.toContain('SENSITIVE-SCHEMA');
    expect(serialized).not.toContain('unsupported');
  });

  it('records typed probe failures at the failing boundary', async () => {
    beginImportV2DiagnosticAttempt('csv');
    const native = nativePlugin();
    vi.mocked(native.probe).mockResolvedValue({
      status: 'unavailable',
      failure: { code: 'MODEL_UNAVAILABLE', message: 'Model unavailable.' },
    });
    const client = createHarnexClient(() => resolvePlatformCapabilities('android'), native);

    await client.connect();
    await client.probe(HARNEX_SCHEMA_INFERENCE_USE_CASE);

    expect(getImportV2Diagnostics()).toContainEqual(expect.objectContaining({
      stage: 'harnex-probe',
      result: 'unavailable',
      details: expect.objectContaining({ failureCode: 'MODEL_UNAVAILABLE' }),
    }));
  });
});
