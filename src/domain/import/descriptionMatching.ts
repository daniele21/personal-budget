import type { DescriptionMatchKey, PreparedImportRow } from './structuredImportTypes';

export const DESCRIPTION_MATCH_KEY_VERSION = 'v1' as const;

export function normalizeImportDescription(description: string): string {
  return description.normalize('NFKC').trim().toLowerCase().replace(/\s+/gu, ' ');
}

export function createDescriptionMatchKey(
  description: string,
  type: 'expense' | 'income',
): DescriptionMatchKey {
  return `description:${DESCRIPTION_MATCH_KEY_VERSION}|${type}|${normalizeImportDescription(description)}` as DescriptionMatchKey;
}

export interface DescriptionMatchGroup {
  matchKey: DescriptionMatchKey;
  rowIds: string[];
}

export function groupPreparedRowsByDescription(
  rows: readonly PreparedImportRow[],
  includedOnly = true,
): DescriptionMatchGroup[] {
  const groups = new Map<DescriptionMatchKey, string[]>();
  for (const row of rows) {
    if (includedOnly && !row.included) continue;
    const rowIds = groups.get(row.descriptionMatchKey);
    if (rowIds) rowIds.push(row.rowId);
    else groups.set(row.descriptionMatchKey, [row.rowId]);
  }
  return [...groups.entries()].map(([matchKey, rowIds]) => ({ matchKey, rowIds }));
}
