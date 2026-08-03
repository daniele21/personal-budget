import type { Transaction } from '../../types';
import type { PreparedImportRow } from './structuredImportTypes';

export type ImportUuidFactory = () => string;

function secureUuid(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') throw new Error('secure_uuid_unavailable');
  return globalThis.crypto.randomUUID();
}

function nextAvailableUuid(occupied: Set<string>, uuidFactory: ImportUuidFactory): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = uuidFactory();
    if (!candidate || candidate.length > 256) continue;
    if (!occupied.has(candidate)) {
      occupied.add(candidate);
      return candidate;
    }
  }
  throw new Error('transaction_id_collision_limit');
}

function titleFromDescription(description: string): string {
  return [...description].slice(0, 80).join('');
}

export function mapPreparedImportRowsToTransactions(
  rows: readonly PreparedImportRow[],
  occupiedIds: ReadonlySet<string>,
  uuidFactory: ImportUuidFactory = secureUuid,
): Transaction[] {
  const occupied = new Set(occupiedIds);
  return rows
    .filter((row) => row.included && !row.issues.some((issue) => issue.severity === 'error'))
    .map((row) => ({
      id: nextAvailableUuid(occupied, uuidFactory),
      amount: Math.abs(row.signedAmountMinor) / 100,
      type: row.signedAmountMinor < 0 ? 'expense' : 'income',
      category: row.category,
      date: `${row.date}T00:00:00.000Z`,
      title: titleFromDescription(row.description),
      description: row.description,
      paymentMethod: 'Bank Transfer',
    }));
}
