import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NotificationCenter } from '../../NotificationCenter';

const mocks = vi.hoisted(() => ({
  markAllRead: vi.fn(),
  close: vi.fn(),
}));

vi.mock('../../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    records: [],
    unreadCount: 0,
    markAllRead: mocks.markAllRead,
  }),
}));

vi.mock('../../../state/PaymentDetectionProvider', () => ({
  usePaymentDetection: () => ({
    candidates: [{ id: 'AbCdEfGhIjKlMnOpQrStUvWx' }],
  }),
}));

function LocationProbe() {
  return <span>{useLocation().pathname}</span>;
}

describe('NotificationCenter payment candidate integration', () => {
  it('links to the live native queue without creating a notification record', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NotificationCenter isOpen onClose={mocks.close} />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(screen.getByText(/not copied into notification history/i))
      .toBeInTheDocument();
    await user.click(screen.getByRole('button', {
      name: 'Open 1 payment to review',
    }));

    expect(screen.getByText('/payment-detection')).toBeInTheDocument();
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
