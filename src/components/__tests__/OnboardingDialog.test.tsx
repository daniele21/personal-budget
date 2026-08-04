import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingDialog } from '../OnboardingDialog';

function renderDialog(monthlyBudget = 0) {
  const callbacks = {
    onSetMonthlyBudget: vi.fn(),
    onAddCategory: vi.fn(),
    onComplete: vi.fn(),
  };
  render(<OnboardingDialog isOpen monthlyBudget={monthlyBudget} {...callbacks} />);
  return callbacks;
}

describe('OnboardingDialog', () => {
  it('has an accessible name, labelled budget field and no implicit skip action', () => {
    renderDialog();

    expect(screen.getByRole('dialog', { name: 'Set your monthly limit' })).toBeVisible();
    expect(screen.getByLabelText('Monthly spending limit (€)')).toHaveAttribute('aria-describedby');
    expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();
  });

  it('blocks invalid budgets without completing silently', async () => {
    const user = userEvent.setup();
    const callbacks = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('alert')).toHaveTextContent('greater than zero');
    expect(callbacks.onSetMonthlyBudget).not.toHaveBeenCalled();
    expect(callbacks.onComplete).not.toHaveBeenCalled();
  });

  it('commits the validated budget and added categories only on finish', async () => {
    const user = userEvent.setup();
    const callbacks = renderDialog();

    await user.type(screen.getByLabelText('Monthly spending limit (€)'), '1800');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('dialog', { name: 'Review your categories' })).toBeVisible();

    await user.type(screen.getByLabelText('Add another category'), 'Pets');
    await user.click(screen.getByRole('button', { name: 'Add category' }));
    expect(screen.getByText('Pets')).toBeVisible();
    expect(callbacks.onSetMonthlyBudget).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Finish setup' }));

    expect(callbacks.onSetMonthlyBudget).toHaveBeenCalledWith(1800);
    expect(callbacks.onAddCategory).toHaveBeenCalledWith('Pets');
    expect(callbacks.onComplete).toHaveBeenCalledOnce();
  });

  it('does not close or complete when Escape is pressed', async () => {
    const user = userEvent.setup();
    const callbacks = renderDialog();

    await user.keyboard('{Escape}');

    expect(screen.getByRole('dialog')).toBeVisible();
    expect(callbacks.onComplete).not.toHaveBeenCalled();
  });

  it('restores an existing positive budget when reopened', () => {
    renderDialog(1250);
    expect(screen.getByLabelText('Monthly spending limit (€)')).toHaveValue(1250);
  });
});
