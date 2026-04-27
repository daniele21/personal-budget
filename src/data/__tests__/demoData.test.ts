import { describe, expect, it } from 'vitest';
import { buildDemoData } from '../demoData';

describe('buildDemoData', () => {
  it('creates a complete local demo dataset for the selected month', () => {
    const demoData = buildDemoData(new Date(2026, 3, 27));

    expect(demoData.transactions.length).toBeGreaterThan(0);
    expect(demoData.budgets.length).toBeGreaterThan(0);
    expect(demoData.recurring.length).toBeGreaterThan(0);
    expect(demoData.accounts.length).toBeGreaterThan(0);
    expect(demoData.savingsGoals.length).toBeGreaterThan(0);
    expect(demoData.monthlyBudget).toBeGreaterThan(0);
    expect(demoData.archivedCategories).toEqual([]);
  });

  it('keeps current-month transactions in the runtime month', () => {
    const demoData = buildDemoData(new Date(2026, 3, 27));
    const currentMonthTransactions = demoData.transactions.filter((transaction) =>
      transaction.id.endsWith('current'),
    );

    expect(currentMonthTransactions.length).toBeGreaterThan(0);
    expect(currentMonthTransactions.every((transaction) => transaction.date.startsWith('2026-04'))).toBe(true);
  });
});
