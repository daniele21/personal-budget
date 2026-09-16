import type { ImportV2DateParserId } from './profile';

export const IMPORT_V2_INTERPRETATION_CONTRACT_VERSION = 1 as const;

export const IMPORT_V2_INTERPRETATION_LIMITS = {
  worksheets: 12,
  sampledRowsPerSheet: 96,
  logicalColumns: 64,
  cellCodePoints: 256,
  previewRows: 12,
} as const;

export type ImportV2RawCell =
  | string
  | number
  | { kind: 'date'; isoDate: string }
  | { kind: 'formula' }
  | undefined;

export interface ImportV2RawRow {
  rowNumber: number;
  cells: readonly ImportV2RawCell[];
  mergedColumnIndexes?: readonly number[];
}

export interface ImportV2RawSheet {
  id: string;
  name: string;
  state: 'visible' | 'hidden' | 'veryHidden';
  rows: readonly ImportV2RawRow[];
  totalNonEmptyRows: number;
  samplesTruncated: boolean;
}

export interface ImportV2RawDocument {
  contractVersion: typeof IMPORT_V2_INTERPRETATION_CONTRACT_VERSION;
  sourceKind: 'csv' | 'xlsx';
  sheets: readonly ImportV2RawSheet[];
}

export type ImportV2RecordDelimiter = ',' | ';' | '\t' | '|';

export type ImportV2RecordLayoutPlan =
  | {
      kind: 'grid';
      headerRowNumber: number;
      firstDataRowNumber: number;
    }
  | {
      kind: 'delimited-cell';
      sourceColumnIndex: number;
      delimiter: ImportV2RecordDelimiter;
      stripOuterQuotes: boolean;
      headerRowNumber: number;
      firstDataRowNumber: number;
    };

export type ImportV2AmountPlan =
  | {
      strategy: 'signed-negative-expense' | 'signed-positive-expense';
      columnIndex: number;
    }
  | {
      strategy: 'debit-credit';
      debitColumnIndex: number;
      creditColumnIndex: number;
    }
  | {
      strategy: 'amount-direction';
      amountColumnIndex: number;
      directionColumnIndex: number;
      directionMapId: 'debit-credit-v1';
    };

export interface ImportV2TransformationPlan {
  contractVersion: typeof IMPORT_V2_INTERPRETATION_CONTRACT_VERSION;
  sheetId: string;
  layout: ImportV2RecordLayoutPlan;
  date: {
    columnIndex: number;
    parser: ImportV2DateParserId;
  };
  description: {
    columnIndexes: readonly number[];
  };
  amount: ImportV2AmountPlan;
}

export interface ImportV2PreviewProvenance {
  sourceRowNumber: number;
  dateColumnIndex: number;
  descriptionColumnIndexes: readonly number[];
  amountColumnIndexes: readonly number[];
}

export interface ImportV2PreviewRow {
  date: string;
  description: string;
  signedAmountMinor: number;
  type: 'expense' | 'income';
  provenance: ImportV2PreviewProvenance;
}

export interface ImportV2InterpretationProposal {
  proposalId: string;
  plan: ImportV2TransformationPlan;
  preview: readonly ImportV2PreviewRow[];
  unresolvedSourceRowNumbers: readonly number[];
}

export interface ConfirmedImportV2Interpretation {
  status: 'confirmed';
  proposalId: string;
  plan: ImportV2TransformationPlan;
}

export type ImportV2InterpretationFeedbackArea =
  | 'date'
  | 'amount'
  | 'description'
  | 'table'
  | 'missing-transactions'
  | 'row-interpretation'
  | 'other';

export interface ImportV2InterpretationFeedback {
  area: ImportV2InterpretationFeedbackArea;
  previousProposal?: {
    proposalId: string;
    plan: ImportV2TransformationPlan;
  };
  /** Transitional W12.1 compatibility; removed once candidate mapping is retired. */
  previousSelection?: {
    sheetId: string;
    headerCandidateId: string;
    dateCandidateId: string;
    descriptionColumnIds: readonly string[];
    amountCandidateId: string;
  };
}

export type ImportV2PlanIssueCode =
  | 'unknown-sheet'
  | 'invalid-row-range'
  | 'invalid-column-index'
  | 'duplicate-description-column'
  | 'invalid-amount-columns';

export interface ImportV2PlanIssue {
  code: ImportV2PlanIssueCode;
}

function allPlanColumnIndexes(plan: ImportV2TransformationPlan): number[] {
  const amountIndexes = plan.amount.strategy === 'debit-credit'
    ? [plan.amount.debitColumnIndex, plan.amount.creditColumnIndex]
    : plan.amount.strategy === 'amount-direction'
      ? [plan.amount.amountColumnIndex, plan.amount.directionColumnIndex]
      : [plan.amount.columnIndex];
  return [plan.date.columnIndex, ...plan.description.columnIndexes, ...amountIndexes];
}

export function validateImportV2TransformationPlan(
  document: ImportV2RawDocument,
  plan: ImportV2TransformationPlan,
): readonly ImportV2PlanIssue[] {
  const issues: ImportV2PlanIssue[] = [];
  const sheet = document.sheets.find(({ id }) => id === plan.sheetId);
  if (!sheet) return [{ code: 'unknown-sheet' }];

  const sampledRows = new Set(sheet.rows.map(({ rowNumber }) => rowNumber));
  if (
    plan.layout.headerRowNumber < 1
    || plan.layout.firstDataRowNumber <= plan.layout.headerRowNumber
    || !sampledRows.has(plan.layout.headerRowNumber)
    || !sampledRows.has(plan.layout.firstDataRowNumber)
  ) {
    issues.push({ code: 'invalid-row-range' });
  }

  const indexes = allPlanColumnIndexes(plan);
  if (
    plan.layout.kind === 'delimited-cell'
    && (plan.layout.sourceColumnIndex < 0 || plan.layout.sourceColumnIndex >= IMPORT_V2_INTERPRETATION_LIMITS.logicalColumns)
  ) {
    issues.push({ code: 'invalid-column-index' });
  }
  if (indexes.some((index) => index < 0 || index >= IMPORT_V2_INTERPRETATION_LIMITS.logicalColumns)) {
    issues.push({ code: 'invalid-column-index' });
  }

  if (
    plan.description.columnIndexes.length === 0
    || new Set(plan.description.columnIndexes).size !== plan.description.columnIndexes.length
  ) {
    issues.push({ code: 'duplicate-description-column' });
  }

  if (
    (plan.amount.strategy === 'debit-credit'
      && plan.amount.debitColumnIndex === plan.amount.creditColumnIndex)
    || (plan.amount.strategy === 'amount-direction'
      && plan.amount.amountColumnIndex === plan.amount.directionColumnIndex)
  ) {
    issues.push({ code: 'invalid-amount-columns' });
  }

  return issues;
}

export function confirmImportV2Interpretation(
  proposal: ImportV2InterpretationProposal,
): ConfirmedImportV2Interpretation {
  return {
    status: 'confirmed',
    proposalId: proposal.proposalId,
    plan: proposal.plan,
  };
}
