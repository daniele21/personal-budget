import type { BuiltPortableArchive } from './archiveBuilder';

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadPortableArchive(archive: BuiltPortableArchive): void {
  downloadBlob(archive.blob, archive.filename);
}
