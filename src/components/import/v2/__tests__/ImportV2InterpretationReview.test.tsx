import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ImportV2InterpretationProposal } from '../../../../domain/import/v2';
import { ImportV2InterpretationReview } from '../ImportV2InterpretationReview';

function proposal(): ImportV2InterpretationProposal {
  return {
    proposalId: 'proposal-1',
    plan: {
      contractVersion: 1,
      sheetId: 'sheet-1',
      layout: {
        kind: 'delimited-cell',
        sourceColumnIndex: 0,
        delimiter: ';',
        stripOuterQuotes: false,
        headerRowNumber: 1,
        firstDataRowNumber: 2,
      },
      date: { columnIndex: 0, parser: 'dmy-slash' },
      description: { columnIndexes: [1] },
      amount: { strategy: 'debit-credit', debitColumnIndex: 2, creditColumnIndex: 3 },
    },
    preview: [
      {
        date: '2026-09-12',
        description: 'SUPERMERCATO',
        signedAmountMinor: -4320,
        type: 'expense',
        provenance: {
          sourceRowNumber: 2,
          dateColumnIndex: 0,
          descriptionColumnIndexes: [1],
          amountColumnIndexes: [2, 3],
        },
      },
      {
        date: '2026-09-13',
        description: 'STIPENDIO',
        signedAmountMinor: 210000,
        type: 'income',
        provenance: {
          sourceRowNumber: 3,
          dateColumnIndex: 0,
          descriptionColumnIndexes: [1],
          amountColumnIndexes: [2, 3],
        },
      },
    ],
    unresolvedSourceRowNumbers: [],
  };
}

describe('ImportV2InterpretationReview', () => {
  it('shows a deterministic preview and requires an explicit correct decision', () => {
    const onConfirm = vi.fn();
    render(
      <ImportV2InterpretationReview
        proposal={proposal()}
        onConfirm={onConfirm}
        onRequestRevision={vi.fn()}
      />,
    );

    expect(screen.getByText('SUPERMERCATO')).toBeInTheDocument();
    expect(screen.getByText('STIPENDIO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, this is correct' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, this is correct' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('collects structured feedback before requesting a Harnex revision', () => {
    const onRequestRevision = vi.fn();
    render(
      <ImportV2InterpretationReview
        proposal={proposal()}
        onConfirm={vi.fn()}
        onRequestRevision={onRequestRevision}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Something is wrong' }));
    const revise = screen.getByRole('button', { name: 'Ask Harnex to revise' });
    expect(revise).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: /Amounts/i }));
    expect(revise).toBeEnabled();
    fireEvent.click(revise);
    expect(onRequestRevision).toHaveBeenCalledWith('amount');
  });

  it('warns when sampled rows remain unresolved instead of hiding them', () => {
    render(
      <ImportV2InterpretationReview
        proposal={{ ...proposal(), unresolvedSourceRowNumbers: [7, 9] }}
        onConfirm={vi.fn()}
        onRequestRevision={vi.fn()}
      />,
    );
    expect(screen.getByText(/2 sampled rows still need attention/i)).toBeInTheDocument();
  });

  it('shows a blocking full-file issue with revision and manual recovery instead of a confirm action', () => {
    const onContinueManually = vi.fn();
    render(
      <ImportV2InterpretationReview
        proposal={proposal()}
        issue="2 source rows still need a safe interpretation."
        onConfirm={vi.fn()}
        onRequestRevision={vi.fn()}
        onContinueManually={onContinueManually}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('2 source rows still need a safe interpretation');
    expect(screen.queryByRole('button', { name: 'Yes, this is correct' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Something is wrong' })).toBeEnabled();
    const manual = screen.getByRole('button', { name: 'Continue manually' });
    expect(manual).toBeEnabled();
    fireEvent.click(manual);
    expect(onContinueManually).toHaveBeenCalledTimes(1);
  });

  it('makes the full-file execution phase explicit while confirmation is busy', () => {
    render(
      <ImportV2InterpretationReview
        proposal={proposal()}
        isBusy
        onConfirm={vi.fn()}
        onRequestRevision={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Checking whole file…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Something is wrong' })).toBeDisabled();
  });
});
