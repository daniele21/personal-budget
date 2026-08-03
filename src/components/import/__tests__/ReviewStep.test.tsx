import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  calculateImportSummary,
  createDescriptionMatchKey,
  createImportIssue,
  type PreparedImportRow,
  type PreparedTransactionImport,
} from '../../../domain/import';
import { ReviewStep } from '../ReviewStep';

function row(index: number, overrides: Partial<PreparedImportRow> = {}): PreparedImportRow {
  const description = overrides.description ?? `Merchant ${index}`;
  const type = overrides.type ?? 'expense';
  return {
    rowId: overrides.rowId ?? `row-${index}`,
    sourceRowNumber: overrides.sourceRowNumber ?? index + 1,
    date: overrides.date ?? '2026-08-01',
    description,
    signedAmountMinor: overrides.signedAmountMinor ?? -1000,
    type,
    category: overrides.category ?? 'Uncategorized',
    categorySource: overrides.categorySource ?? 'uncategorized',
    included: overrides.included ?? true,
    selectedForBatch: overrides.selectedForBatch ?? false,
    descriptionMatchKey: overrides.descriptionMatchKey ?? createDescriptionMatchKey(description, type),
    duplicateMatches: overrides.duplicateMatches ?? [],
    issues: overrides.issues ?? [],
  };
}

function prepared(rows: PreparedImportRow[]): PreparedTransactionImport {
  return {
    sourceKind: 'structured-csv',
    preparedAt: '2026-08-03T00:00:00.000Z',
    baseLedgerFingerprint: 'fingerprint',
    rows,
    issues: [],
    summary: calculateImportSummary(rows),
    undoStack: [],
  };
}

function Harness({ initial }: { initial: PreparedTransactionImport }) {
  const [state, setState] = useState(initial);
  return (
    <>
      <ReviewStep
        prepared={state}
        categories={['Groceries', 'Income']}
        onPreparedUpdated={setState}
        onAddCategory={vi.fn()}
      />
      <output data-testid="state">{JSON.stringify(state)}</output>
    </>
  );
}

describe('ReviewStep', () => {
  it('applies one category to rows with the same normalized description and type', () => {
    const first = row(1, { description: 'AURA MARKET' });
    const second = row(2, { description: ' aura   market ' });
    const income = row(3, { description: 'Aura Market', type: 'income', signedAmountMinor: 1000 });
    render(<Harness initial={prepared([first, second, income])} />);

    fireEvent.click(screen.getAllByRole('button', { name: /Set category/ })[0]!);
    fireEvent.click(screen.getByRole('button', { name: /Category: not selected/ }));
    fireEvent.click(screen.getByRole('option', { name: /Groceries/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Same description (2)' }));

    const state = JSON.parse(screen.getByTestId('state').textContent ?? '{}') as PreparedTransactionImport;
    expect(state.rows.map((item) => item.category)).toEqual(['Groceries', 'Groceries', 'Uncategorized']);
  });

  it('keeps inclusion and batch selection as separate controls with undo', () => {
    render(<Harness initial={prepared([row(1), row(2)])} />);
    fireEvent.click(screen.getAllByRole('checkbox', { name: /Select for batch/ })[0]!);
    expect(screen.getByText('1 selected for batch edit')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Exclude selected' }));

    let state = JSON.parse(screen.getByTestId('state').textContent ?? '{}') as PreparedTransactionImport;
    expect(state.rows[0]?.included).toBe(false);
    expect(state.rows[0]?.selectedForBatch).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Undo/ }));
    state = JSON.parse(screen.getByTestId('state').textContent ?? '{}') as PreparedTransactionImport;
    expect(state.rows[0]?.included).toBe(true);
    expect(state.rows[0]?.selectedForBatch).toBe(true);
  });

  it('paginates at 100 rows and exposes empty filter states', () => {
    render(<Harness initial={prepared(Array.from({ length: 101 }, (_, index) => row(index + 1, {
      category: 'Groceries',
      categorySource: 'manual',
    })))} />);
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(100);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Warnings' }));
    expect(screen.getByText('No rows in this filter')).toBeInTheDocument();
  });

  it('shows future-date and duplicate warnings without confidence labels', () => {
    render(<Harness initial={prepared([row(1, {
      issues: [createImportIssue('future_date', 'warning', { rowNumber: 2, column: 'date' })],
      duplicateMatches: [{ source: 'ledger', referenceId: 'tx-1', count: 1 }],
    })])} />);
    const article = screen.getByRole('article');
    expect(within(article).getByText('Future date')).toBeInTheDocument();
    expect(within(article).getByText('Possible duplicate')).toBeInTheDocument();
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
  });
});

