import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImportV2MappingEditor } from '../ImportV2MappingEditor';
import { ImportV2TaskStatePanel } from '../ImportV2TaskStatePanel';
import { EMPTY_IMPORT_V2_MAPPING, type ImportV2MappingDraft } from '../importV2TaskState';

const dateOptions = [{ id: 'date:0:iso-date', label: 'Booking date', detail: '2026-08-31' }];
const amountOptions = [{ id: 'amount:2:signed-negative-expense', label: 'Amount', detail: '-42.10' }];
const descriptionOptions = [{ id: 'column:1', label: 'Details', detail: 'Grocery store' }];

function MappingHarness({
  initialValue = EMPTY_IMPORT_V2_MAPPING,
  resolution = 'ambiguous',
  onConfirm = vi.fn(),
}: {
  initialValue?: ImportV2MappingDraft;
  resolution?: 'resolved' | 'ambiguous';
  onConfirm?: () => void;
}) {
  const [value, setValue] = useState<ImportV2MappingDraft>(initialValue);
  return (
    <ImportV2MappingEditor
      resolution={resolution}
      value={value}
      dateOptions={dateOptions}
      amountOptions={amountOptions}
      descriptionOptions={descriptionOptions}
      onChange={setValue}
      onConfirm={onConfirm}
    />
  );
}

describe('Import V2 isolated UX components', () => {
  it('makes an ambiguous mapping explicit and editable before confirmation', () => {
    const onConfirm = vi.fn();
    render(<MappingHarness onConfirm={onConfirm} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Aura needs your confirmation');
    expect(screen.getByRole('button', { name: 'Confirm mapping' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Transaction date'), { target: { value: dateOptions[0].id } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: amountOptions[0].id } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Details/ }));

    const confirm = screen.getByRole('button', { name: 'Confirm mapping' });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('still requires explicit confirmation for a resolved suggestion', () => {
    const onConfirm = vi.fn();
    render(
      <MappingHarness
        resolution="resolved"
        initialValue={{
          dateCandidateId: dateOptions[0].id,
          amountCandidateId: amountOptions[0].id,
          descriptionColumnIds: [descriptionOptions[0].id],
          typeColumnId: null,
        }}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Suggested mapping ready')).toBeInTheDocument();
    expect(screen.getByText(/will not apply the mapping silently/i)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mapping' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('explains local analysis using the user task model rather than implementation details', () => {
    const onAction = vi.fn();
    render(<ImportV2TaskStatePanel state={{ kind: 'local-analysis', step: 'understand-file' }} onAction={onAction} />);

    expect(screen.getByRole('heading', { name: 'Reading the file structure' })).toBeInTheDocument();
    expect(screen.getByText(/on this device/i)).toBeInTheDocument();
    expect(screen.queryByText(/Binder|batch|model/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onAction).toHaveBeenCalledWith('cancel');
  });

  it('keeps manual recovery visible when optional assistance is unavailable', () => {
    const onAction = vi.fn();
    render(
      <ImportV2TaskStatePanel
        state={{ kind: 'assistance-unavailable', step: 'understand-file', reason: 'host-missing' }}
        onAction={onAction}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Continue without assistance');
    fireEvent.click(screen.getByRole('button', { name: 'Continue manually' }));
    expect(onAction).toHaveBeenCalledWith('continue-manually');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
  });

  it('announces classification progress and provides cancellation', () => {
    render(
      <ImportV2TaskStatePanel
        state={{ kind: 'classification-progress', step: 'categorize', completed: 3, total: 8 }}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByText(/3 of 8 transaction groups checked \(38%\)/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Category suggestion progress' })).toHaveAttribute('value', '3');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });

  it('keeps partial results reviewable with retry and manual continuation', () => {
    render(
      <ImportV2TaskStatePanel
        state={{ kind: 'classification-partial-failure', step: 'categorize', completed: 5, failed: 3, total: 8 }}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('5 of 8 groups completed');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Continue manually' })).toBeEnabled();
  });

  it('requires retry after deterministic transaction checks are cancelled', () => {
    const onAction = vi.fn();
    render(
      <ImportV2TaskStatePanel
        state={{ kind: 'cancelled', step: 'check-transactions' }}
        onAction={onAction}
      />,
    );

    expect(screen.getByText(/retry the transaction checks before continuing to Review/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue manually' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onAction).toHaveBeenCalledWith('retry');
  });
});
