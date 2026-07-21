import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BottomNav } from '../BottomNav';

function renderNav(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

describe('BottomNav', () => {
  it('renders four destinations at equal spacing around the central Add action', () => {
    const { container } = renderNav();

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute('href', '/transactions');
    expect(screen.getByRole('link', { name: 'Add transaction' })).toHaveAttribute('href', '/add');
    expect(screen.getByRole('link', { name: 'Budgets' })).toHaveAttribute('href', '/budgets');
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/reports');
    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(container.querySelector('[data-nav-position="center"]')).toContainElement(
      screen.getByRole('link', { name: 'Add transaction' }),
    );
  });

  it('keeps report aliases under the Reports active state', () => {
    renderNav('/reports/year');

    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('aria-current', 'page');
  });
});
