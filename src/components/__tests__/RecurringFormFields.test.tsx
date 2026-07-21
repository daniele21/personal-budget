import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RecurringFormFields } from '../planning/RecurringFormFields';

describe('RecurringFormFields', () => {
  it('exposes the same type, schedule, reminder, and amount controls to both planning pages', async () => {
    const user = userEvent.setup();
    const onTypeChange = vi.fn();
    const onFrequencyChange = vi.fn();
    const onReminderEnabledChange = vi.fn();
    const onAmountClick = vi.fn();

    render(
      <RecurringFormFields
        name="Rent"
        amount="950"
        startDate="2026-07-01"
        endDate=""
        category="Housing"
        type="expense"
        frequency="monthly"
        reminderEnabled={false}
        reminderLeadDays={1}
        categories={['Housing']}
        onNameChange={vi.fn()}
        onAmountClick={onAmountClick}
        onStartDateChange={vi.fn()}
        onEndDateChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onTypeChange={onTypeChange}
        onFrequencyChange={onFrequencyChange}
        onReminderEnabledChange={onReminderEnabledChange}
        onReminderLeadDaysChange={vi.fn()}
        onAddCategory={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Income' }));
    await user.click(screen.getByRole('button', { name: 'Weekly' }));
    await user.click(screen.getByRole('switch', { name: 'Recurring reminder' }));
    await user.click(screen.getByRole('button', { name: /Amount/ }));

    expect(onTypeChange).toHaveBeenCalledWith('income');
    expect(onFrequencyChange).toHaveBeenCalledWith('weekly');
    expect(onReminderEnabledChange).toHaveBeenCalledWith(true);
    expect(onAmountClick).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Start Date')).toHaveValue('2026-07-01');
  });
});
