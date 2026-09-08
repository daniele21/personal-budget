import type { AmountCandidate, HeaderCandidate, SpreadsheetProfile } from '../../../domain/import/v2';
import type { ImportV2MappingOption } from './ImportV2MappingEditor';

export interface ImportV2MappingChoices {
  dateOptions: ImportV2MappingOption[];
  amountOptions: ImportV2MappingOption[];
  descriptionOptions: ImportV2MappingOption[];
}

function columnLabel(header: HeaderCandidate, columnId: string): string {
  const column = header.columns.find(({ id }) => id === columnId);
  return column?.header || `Column ${(column?.columnIndex ?? 0) + 1}`;
}

function context(sheetName: string, header: HeaderCandidate): string {
  return `${sheetName} · header row ${header.rowNumber}`;
}

function amountLabel(header: HeaderCandidate, candidate: AmountCandidate): string {
  switch (candidate.strategy) {
    case 'signed-negative-expense':
      return `${columnLabel(header, candidate.columnId)} · signed amount`;
    case 'signed-positive-expense':
      return `${columnLabel(header, candidate.columnId)} · positive expenses`;
    case 'debit-credit':
      return `${columnLabel(header, candidate.debitColumnId)} / ${columnLabel(header, candidate.creditColumnId)} · debit / credit`;
    case 'amount-direction':
      return `${columnLabel(header, candidate.amountColumnId)} + ${columnLabel(header, candidate.directionColumnId)} · amount / direction`;
  }
}

export function createImportV2MappingChoices(profile: SpreadsheetProfile): ImportV2MappingChoices {
  const dateOptions: ImportV2MappingOption[] = [];
  const amountOptions: ImportV2MappingOption[] = [];
  const descriptionOptions: ImportV2MappingOption[] = [];

  for (const sheet of profile.sheets) {
    if (sheet.state !== 'visible') continue;
    for (const header of sheet.headerCandidates) {
      const detail = context(sheet.name, header);
      for (const candidate of header.dateCandidates) {
        dateOptions.push({
          id: candidate.id,
          label: columnLabel(header, candidate.columnId),
          detail: `${candidate.parser} · ${detail}`,
        });
      }
      for (const candidate of header.amountCandidates) {
        amountOptions.push({ id: candidate.id, label: amountLabel(header, candidate), detail });
      }
      for (const columnId of header.descriptionCandidateColumnIds) {
        descriptionOptions.push({ id: columnId, label: columnLabel(header, columnId), detail });
      }
    }
  }

  return { dateOptions, amountOptions, descriptionOptions };
}
