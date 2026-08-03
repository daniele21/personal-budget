import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Transaction } from '../../types';
import { CategoryReportPage } from '../CategoryReportPage';

const mockUseApp = vi.fn();

vi.mock('../../context/AppContext', () => ({
  useApp: () => mockUseApp(),
}));

function transaction(overrides: Partial<Transaction> & Pick<Transaction, 'id' | 'amount' | 'date'>): Transaction {
  return {
    type: 'expense',
    category: 'Food',
    title: 'Groceries',
    description: '',
    paymentMethod: 'Card',
    ...overrides,
  };
}

function dateInput(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

describe('CategoryReportPage', () => {
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const rangeStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const rangeEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const transactions = [
    transaction({
      id: 'old',
      amount: 100,
      title: 'Old groceries',
      date: new Date(today.getFullYear(), today.getMonth() - 2, 5, 12).toISOString(),
    }),
    transaction({
      id: 'recent',
      amount: 300,
      title: 'Big groceries',
      date: new Date(today.getFullYear(), today.getMonth() - 1, 5, 12).toISOString(),
    }),
    transaction({
      id: 'current',
      amount: 200,
      title: 'Current groceries',
      date: new Date(today.getFullYear(), today.getMonth(), 5, 12).toISOString(),
    }),
  ];

  beforeEach(() => {
    mockUseApp.mockReturnValue({
      transactions,
      categories: ['Food'],
      archivedCategories: [],
    });
  });

  function renderPage(
    path = `/reports/categories/Food?range=3M&startDate=${dateInput(rangeStart)}&endDate=${dateInput(rangeEnd)}&lens=actual`,
    analyticsLens: 'actual' | 'normalized' | 'extras' = 'actual',
    onAnalyticsLensChange = vi.fn(),
  ) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/reports/categories/:category"
            element={(
              <CategoryReportPage
                analyticsLens={analyticsLens}
                onAnalyticsLensChange={onAnalyticsLensChange}
              />
            )}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('shows the selected total, complete-month average, trend, and top transactions', () => {
    renderPage();

    expect(screen.getByText('Spent on Food')).toBeInTheDocument();
    expect(screen.getAllByText('€600.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Monthly average')).toBeInTheDocument();
    expect(screen.getByText('€200.00')).toBeInTheDocument();
    expect(screen.getByText('2 complete months')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Monthly spending trend for Food/i })).toBeInTheDocument();
    expect(screen.getByText('Big groceries')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View all Food transactions/i })).toHaveAttribute(
      'href',
      expect.stringContaining('category=Food'),
    );
  });

  it('defaults a category detail opened without scope to 12 months', () => {
    renderPage('/reports/categories/Food');

    expect(screen.getByRole('combobox', { name: /select period/i })).toHaveValue('12M');
  });

  it('preserves the extras lens in the filtered-history link', () => {
    mockUseApp.mockReturnValue({
      transactions: [
        transaction({
          id: 'extra',
          amount: 400,
          reportingClass: 'extra',
          date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 5, 12).toISOString(),
        }),
      ],
      categories: ['Food'],
      archivedCategories: [],
    });

    renderPage(
      `/reports/categories/Food?range=1M&startDate=${dateInput(currentMonth)}&endDate=${dateInput(rangeEnd)}&lens=extras`,
      'extras',
    );

    expect(screen.getByRole('link', { name: /View all Food transactions/i })).toHaveAttribute(
      'href',
      expect.stringContaining('lens=extras'),
    );
  });

  it('synchronizes a valid lens from the route on first entry', () => {
    const onChange = vi.fn();
    renderPage(
      `/reports/categories/Food?range=3M&startDate=${dateInput(rangeStart)}&endDate=${dateInput(rangeEnd)}&lens=normalized`,
      'actual',
      onChange,
    );

    expect(onChange).toHaveBeenCalledWith('normalized');
  });

  it('fails safely when a bookmarked category was renamed', () => {
    renderPage('/reports/categories/Renamed?range=3M&lens=actual');

    expect(screen.getByText('Category not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to categories/i })).toHaveAttribute('href', '/reports/categories');
  });
});
