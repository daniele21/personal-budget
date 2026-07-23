import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from '../archiveDownload';

describe('archiveDownload', () => {
  afterEach(() => vi.useRealTimers());

  it('starts one download and revokes the temporary object URL', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:aura-test');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadBlob(new Blob(['archive']), 'aura-backup.aura');

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:aura-test');
  });
});
