import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TEST_APP_DATA, TEST_ATTACHMENT, TEST_PREFERENCES } from '../../../domain/archive/__tests__/fixtures';
import type { PortableSnapshot } from '../../../domain/archive';
import { RestorePreview } from '../../../components/archive/RestorePreview';
import { buildPortableArchiveFromSnapshot } from '../archiveBuilder';
import { archivePreflightService } from '../archivePreflightService';

function snapshot(): PortableSnapshot {
  return {
    data: structuredClone(TEST_APP_DATA),
    preferences: structuredClone(TEST_PREFERENCES),
    attachments: [structuredClone(TEST_ATTACHMENT)],
    warnings: [],
  };
}

describe('archivePreflightService', () => {
  it('inspects and prepares an encrypted archive locally without network or storage writes', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const built = await buildPortableArchiveFromSnapshot(snapshot(), {
      passphrase: 'preflight passphrase',
      sourceAppVersion: '1.0.0-test',
      sourceBuildSha: 'test-build',
    });

    await expect(archivePreflightService.inspect(built.blob)).resolves.toEqual({
      encrypted: true,
      payloadByteLength: expect.any(Number),
      fileByteLength: built.byteLength,
    });
    const preview = await archivePreflightService.prepare(built.blob, {
      passphrase: 'preflight passphrase',
    });

    expect(preview.counts.transactions).toBe(TEST_APP_DATA.transactions.length);
    expect(preview.prepared.attachments.get(TEST_ATTACHMENT.transactionId)).toEqual(TEST_ATTACHMENT);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('renders the verified counts and protection state before restore', async () => {
    const built = await buildPortableArchiveFromSnapshot(snapshot(), {
      sourceAppVersion: '1.0.0-test',
      sourceBuildSha: 'test-build',
    });
    const preview = await archivePreflightService.prepare(built.blob);

    render(<RestorePreview preview={preview} />);

    expect(screen.getByText('Archive ready to restore')).toBeInTheDocument();
    expect(screen.getByText('Not encrypted')).toBeInTheDocument();
    expect(screen.getByText('Transactions').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByText('Attachments').nextElementSibling).toHaveTextContent('1');
  });
});
