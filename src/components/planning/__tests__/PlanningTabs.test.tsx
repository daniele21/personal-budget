import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PlanningTabs } from '../PlanningTabs';

describe('PlanningTabs', () => {
  it('uses canonical routes and exposes the active planning view', () => {
    render(
      <MemoryRouter initialEntries={['/calendar']}>
        <PlanningTabs activeView="calendar" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/planning');
    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Recurring' })).toHaveAttribute('href', '/planning/recurring');
  });
});
