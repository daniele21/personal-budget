import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ReportTabs } from '../ReportTabs';

describe('ReportTabs', () => {
  it('links every report view to its canonical route and marks the active view', () => {
    render(
      <MemoryRouter>
        <ReportTabs activeView="compare" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/reports');
    expect(screen.getByRole('link', { name: 'Categories' })).toHaveAttribute('href', '/reports/categories');
    expect(screen.getByRole('link', { name: 'Compare' })).toHaveAttribute('href', '/reports/compare');
    expect(screen.getByRole('link', { name: 'Year' })).toHaveAttribute('href', '/reports/year');
    expect(screen.getByRole('link', { name: 'Compare' })).toHaveAttribute('aria-current', 'page');
  });
});
