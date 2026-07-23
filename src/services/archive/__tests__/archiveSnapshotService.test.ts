import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TEST_APP_DATA,
  TEST_PREFERENCES,
} from '../../../domain/archive/__tests__/fixtures';

const attachmentList = vi.hoisted(() => vi.fn());
const preferencesLoad = vi.hoisted(() => vi.fn());

vi.mock('../../../repositories/attachmentRepository', () => ({
  attachmentRepository: { listAttachments: attachmentList },
}));
vi.mock('../../../repositories/portablePreferencesRepository', () => ({
  portablePreferencesRepository: { load: preferencesLoad },
}));

import { archiveSnapshotService } from '../archiveSnapshotService';

describe('archiveSnapshotService', () => {
  beforeEach(() => {
    preferencesLoad.mockReturnValue(structuredClone(TEST_PREFERENCES));
    attachmentList.mockResolvedValue({
      attachments: [],
      warnings: [{
        code: 'missing_attachment',
        message: 'Missing fixture attachment.',
        path: 'attachments.tx-receipt',
        severity: 'warning',
      }],
      orphanedTransactionIds: [],
    });
  });

  it('collects only validated canonical data, portable preferences, and attachment inventory', async () => {
    const snapshot = await archiveSnapshotService.collect(structuredClone(TEST_APP_DATA));

    expect(snapshot.data).toEqual(TEST_APP_DATA);
    expect(snapshot.preferences).toEqual(TEST_PREFERENCES);
    expect(snapshot.warnings).toEqual([
      expect.objectContaining({ code: 'missing_attachment' }),
    ]);
    expect(attachmentList).toHaveBeenCalledWith(TEST_APP_DATA.transactions);
  });
});
