import { describe, expect, it } from 'vitest';
import { buildDemoData } from '../demoData';
import { validateAppData } from '../../domain/archive';

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
    expect(() => validateAppData(demoData)).not.toThrow();
  });

  it('keeps current-month transactions in the runtime month', () => {
    const demoData = buildDemoData(new Date(2026, 3, 27));
    const currentMonthTransactions = demoData.transactions.filter((transaction) =>
      transaction.id.endsWith('current'),
    );

    expect(currentMonthTransactions.length).toBeGreaterThan(0);
    expect(currentMonthTransactions.every((transaction) => transaction.date.startsWith('2026-04'))).toBe(true);
  });

  it('showcases advanced app features without claiming unavailable receipt attachments', () => {
    const demoData = buildDemoData(new Date(2026, 3, 27));

    // 12-month span coverage
    const months = new Set(demoData.transactions.map((t) => t.date.slice(0, 7)));
    expect(months.size).toBeGreaterThanOrEqual(10);

    // Reporting classes showcase (regular, extra, reimbursement)
    const extraTx = demoData.transactions.filter((t) => t.reportingClass === 'extra');
    const reimbursementTx = demoData.transactions.filter((t) => t.reportingClass === 'reimbursement');
    expect(extraTx.length).toBeGreaterThan(0);
    expect(reimbursementTx.length).toBeGreaterThan(0);

    // Unverified transactions showcase
    const unverifiedTx = demoData.transactions.filter((t) => t.verified === false);
    expect(unverifiedTx.length).toBeGreaterThan(0);

    // Demo data must not claim IndexedDB attachments it did not create.
    const attachmentTx = demoData.transactions.filter((t) => Boolean(t.attachmentUrl));
    expect(attachmentTx).toEqual([]);

    // Accounts diversity (checking, savings, credit, cash)
    const accountTypes = new Set(demoData.accounts.map((a) => a.type));
    expect(accountTypes.has('checking')).toBe(true);
    expect(accountTypes.has('savings')).toBe(true);
    expect(accountTypes.has('credit')).toBe(true);
    expect(accountTypes.has('cash')).toBe(true);

    // Recurring expenses with overrides and reminders
    const recurringWithOverrides = demoData.recurring.filter((r) => r.overrides && r.overrides.length > 0);
    expect(recurringWithOverrides.length).toBeGreaterThan(0);
  });
});
