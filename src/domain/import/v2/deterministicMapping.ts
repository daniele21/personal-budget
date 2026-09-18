import {
  resolveImportV2Mapping,
  type ImportV2MappingSelection,
} from './mapping';
import type {
  AmountCandidate,
  ColumnProfile,
  HeaderCandidate,
  SpreadsheetProfile,
} from './profile';

export type DeterministicImportV2MappingOutcome =
  | { status: 'resolved'; selection: ImportV2MappingSelection }
  | { status: 'unresolved' };

const DATE_HEADERS = [
  'date',
  'data',
  'booking date',
  'booked at',
  'transaction date',
  'operation date',
  'data operazione',
  'data contabile',
  'data valuta',
  'posting date',
  'value date',
] as const;

const DESCRIPTION_HEADERS = [
  'description',
  'descrizione',
  'details',
  'detail',
  'dettagli',
  'causale',
  'merchant',
  'payee',
  'counterparty',
  'memo',
  'reason',
  'beneficiary',
  'beneficiario',
] as const;

const DEBIT_HEADERS = [
  'debit',
  'debit amount',
  'dare',
  'addebito',
  'addebiti',
  'spesa',
  'spese',
  'uscita',
  'uscite',
] as const;

const CREDIT_HEADERS = [
  'credit',
  'credit amount',
  'avere',
  'accredito',
  'accrediti',
  'entrata',
  'entrate',
] as const;

const AMOUNT_HEADERS = ['amount', 'importo', 'value', 'valore'] as const;
const DIRECTION_HEADERS = ['direction', 'type', 'tipo', 'segno'] as const;

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function matchesHeader(value: string, phrases: readonly string[]): boolean {
  const normalized = normalizeHeader(value);
  return phrases.some((phrase) =>
    normalized === phrase
    || normalized.startsWith(`${phrase} `)
    || normalized.endsWith(` ${phrase}`)
    || normalized.includes(` ${phrase} `),
  );
}

function matchingColumns(
  header: HeaderCandidate,
  phrases: readonly string[],
): ColumnProfile[] {
  return header.columns.filter((column) => matchesHeader(column.header, phrases));
}

function resolveDateCandidate(header: HeaderCandidate): string | null {
  const semanticColumns = matchingColumns(header, DATE_HEADERS)
    .filter((column) => column.dateParsers.length === 1 && column.dateLikeRatio > 0);
  if (semanticColumns.length !== 1) return null;
  const column = semanticColumns[0]!;
  const parser = column.dateParsers[0]!;
  return header.dateCandidates.find(
    (candidate) => candidate.columnId === column.id && candidate.parser === parser,
  )?.id ?? null;
}

function resolveDescriptionColumns(header: HeaderCandidate): readonly string[] | null {
  const semantic = matchingColumns(header, DESCRIPTION_HEADERS)
    .filter((column) => header.descriptionCandidateColumnIds.includes(column.id));
  return semantic.length === 1 ? [semantic[0]!.id] : null;
}

function findAmountCandidate(
  header: HeaderCandidate,
  predicate: (candidate: AmountCandidate) => boolean,
): string | null {
  const matches = header.amountCandidates.filter(predicate);
  return matches.length === 1 ? matches[0]!.id : null;
}

function resolveAmountCandidate(header: HeaderCandidate): string | null {
  const debits = matchingColumns(header, DEBIT_HEADERS);
  const credits = matchingColumns(header, CREDIT_HEADERS);
  if (debits.length === 1 && credits.length === 1) {
    const debit = debits[0]!;
    const credit = credits[0]!;
    return findAmountCandidate(
      header,
      (candidate) =>
        candidate.strategy === 'debit-credit'
        && candidate.debitColumnId === debit.id
        && candidate.creditColumnId === credit.id,
    );
  }

  const directions = matchingColumns(header, DIRECTION_HEADERS);
  const genericAmounts = matchingColumns(header, AMOUNT_HEADERS);
  if (genericAmounts.length === 1 && directions.length === 1) {
    const amount = genericAmounts[0]!;
    const direction = directions[0]!;
    const amountDirection = findAmountCandidate(
      header,
      (candidate) =>
        candidate.strategy === 'amount-direction'
        && candidate.amountColumnId === amount.id
        && candidate.directionColumnId === direction.id,
    );
    if (amountDirection) return amountDirection;
  }

  if (debits.length === 1 && credits.length === 0) {
    const debit = debits[0]!;
    return findAmountCandidate(
      header,
      (candidate) =>
        candidate.strategy === 'signed-positive-expense'
        && candidate.columnId === debit.id,
    );
  }

  if (credits.length === 1 && debits.length === 0) {
    const credit = credits[0]!;
    return findAmountCandidate(
      header,
      (candidate) =>
        candidate.strategy === 'signed-negative-expense'
        && candidate.columnId === credit.id,
    );
  }

  if (genericAmounts.length === 1) {
    const amount = genericAmounts[0]!;
    if (amount.negativeNumericRatio > 0) {
      return findAmountCandidate(
        header,
        (candidate) =>
          candidate.strategy === 'signed-negative-expense'
          && candidate.columnId === amount.id,
      );
    }
  }

  return null;
}

function resolveHeader(
  profile: SpreadsheetProfile,
  header: HeaderCandidate,
): ImportV2MappingSelection | null {
  // Auto-selection is intentionally conservative: fallback header guesses stay
  // review-only unless ordinary header/data evidence is present.
  if (header.score < 1) return null;

  const dateCandidateId = resolveDateCandidate(header);
  const amountCandidateId = resolveAmountCandidate(header);
  const descriptionColumnIds = resolveDescriptionColumns(header);
  if (!dateCandidateId || !amountCandidateId || !descriptionColumnIds) return null;

  const selection: ImportV2MappingSelection = {
    dateCandidateId,
    amountCandidateId,
    descriptionColumnIds,
    typeColumnId: null,
  };

  try {
    resolveImportV2Mapping(profile, selection);
    return selection;
  } catch {
    return null;
  }
}

/**
 * Resolves only high-signal, locally provable semantic mappings. Unknown or
 * competing roles remain unresolved so Harnex/manual review can handle them.
 * No model, network, persistence, or ledger operation is reachable here.
 */
export function inferDeterministicImportV2Mapping(
  profile: SpreadsheetProfile,
): DeterministicImportV2MappingOutcome {
  const selections = profile.sheets
    .filter((sheet) => sheet.state === 'visible')
    .flatMap((sheet) => sheet.headerCandidates.map((header) => resolveHeader(profile, header)))
    .filter((selection): selection is ImportV2MappingSelection => selection !== null);

  if (selections.length !== 1) return { status: 'unresolved' };
  return { status: 'resolved', selection: selections[0]! };
}
