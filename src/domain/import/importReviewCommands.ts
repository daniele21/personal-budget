import { calculateImportSummary, reviewSummaryIssues } from './importSummary';
import { groupPreparedRowsByDescription } from './descriptionMatching';
import type {
  ImportCategorySource,
  ImportReviewUndoChange,
  ImportReviewUndoEntry,
  PreparedImportRow,
  PreparedTransactionImport,
} from './structuredImportTypes';

export type CategoryApplicationScope = 'row' | 'selected' | 'same-description';

function rebuildPrepared(
  prepared: PreparedTransactionImport,
  rows: PreparedImportRow[],
  undoEntry?: ImportReviewUndoEntry,
): PreparedTransactionImport {
  return {
    ...prepared,
    rows,
    issues: reviewSummaryIssues(prepared.issues, rows),
    summary: calculateImportSummary(rows),
    undoStack: undoEntry ? [...prepared.undoStack, undoEntry] : prepared.undoStack,
  };
}

function previousState(row: PreparedImportRow): ImportReviewUndoChange['previous'] {
  return {
    category: row.category,
    categorySource: row.categorySource,
    included: row.included,
  };
}

function updateRowsWithUndo(
  prepared: PreparedTransactionImport,
  kind: ImportReviewUndoEntry['kind'],
  update: (row: PreparedImportRow) => PreparedImportRow,
): PreparedTransactionImport {
  const changes: ImportReviewUndoChange[] = [];
  const rows = prepared.rows.map((row) => {
    const next = update(row);
    if (
      next.category === row.category
      && next.categorySource === row.categorySource
      && next.included === row.included
    ) return row;
    changes.push({ rowId: row.rowId, previous: previousState(row) });
    return next;
  });
  return changes.length === 0 ? prepared : rebuildPrepared(prepared, rows, { kind, changes });
}

export function setImportRowsSelected(
  prepared: PreparedTransactionImport,
  rowIds: ReadonlySet<string>,
  selected: boolean,
): PreparedTransactionImport {
  let changed = false;
  const rows = prepared.rows.map((row) => {
    if (!rowIds.has(row.rowId) || row.selectedForBatch === selected) return row;
    changed = true;
    return { ...row, selectedForBatch: selected };
  });
  return changed ? { ...prepared, rows } : prepared;
}

export function applyImportCategory(
  prepared: PreparedTransactionImport,
  options: {
    rowId: string;
    category: string;
    scope: CategoryApplicationScope;
    activeCategories: readonly string[];
  },
): PreparedTransactionImport {
  if (!options.activeCategories.includes(options.category)) {
    throw new Error('import_category_not_active');
  }
  const anchor = prepared.rows.find((row) => row.rowId === options.rowId);
  if (!anchor) throw new Error('import_row_not_found');

  let source: ImportCategorySource;
  let targets: Set<string>;
  if (options.scope === 'row') {
    source = 'manual';
    targets = new Set([anchor.rowId]);
  } else if (options.scope === 'selected') {
    source = 'batch';
    targets = new Set(
      prepared.rows.filter((row) => row.included && row.selectedForBatch).map((row) => row.rowId),
    );
  } else {
    source = 'same-description';
    const group = groupPreparedRowsByDescription(prepared.rows)
      .find((candidate) => candidate.matchKey === anchor.descriptionMatchKey);
    targets = new Set(group?.rowIds ?? []);
  }

  return updateRowsWithUndo(prepared, 'category', (row) => (
    targets.has(row.rowId)
      ? { ...row, category: options.category, categorySource: source }
      : row
  ));
}

export function setImportRowsIncluded(
  prepared: PreparedTransactionImport,
  rowIds: ReadonlySet<string>,
  included: boolean,
): PreparedTransactionImport {
  return updateRowsWithUndo(prepared, 'inclusion', (row) => (
    rowIds.has(row.rowId) ? { ...row, included } : row
  ));
}

export function excludeAllPossibleDuplicates(
  prepared: PreparedTransactionImport,
): PreparedTransactionImport {
  return updateRowsWithUndo(prepared, 'duplicate-exclusion', (row) => (
    row.included && row.duplicateMatches.length > 0 ? { ...row, included: false } : row
  ));
}

export function revalidateImportCategories(
  prepared: PreparedTransactionImport,
  activeCategories: readonly string[],
): PreparedTransactionImport {
  const active = new Set(activeCategories);
  let changed = false;
  const rows = prepared.rows.map((row) => {
    if (row.category === 'Uncategorized' || active.has(row.category)) return row;
    changed = true;
    return { ...row, category: 'Uncategorized', categorySource: 'uncategorized' as const };
  });
  if (!changed) return prepared;
  const next = rebuildPrepared(prepared, rows);
  const sanitizedUndoStack = prepared.undoStack.map((entry) => ({
    ...entry,
    changes: entry.changes.map((change) => (
      change.previous.category === 'Uncategorized' || active.has(change.previous.category)
        ? change
        : {
            ...change,
            previous: {
              ...change.previous,
              category: 'Uncategorized',
              categorySource: 'uncategorized' as const,
            },
          }
    )),
  }));
  return { ...next, undoStack: sanitizedUndoStack };
}

export function undoLastImportReviewChange(
  prepared: PreparedTransactionImport,
): PreparedTransactionImport {
  const entry = prepared.undoStack.at(-1);
  if (!entry) return prepared;
  const previousById = new Map(entry.changes.map((change) => [change.rowId, change.previous]));
  const rows = prepared.rows.map((row) => {
    const previous = previousById.get(row.rowId);
    return previous ? { ...row, ...previous } : row;
  });
  const next = rebuildPrepared(prepared, rows);
  return { ...next, undoStack: prepared.undoStack.slice(0, -1) };
}
