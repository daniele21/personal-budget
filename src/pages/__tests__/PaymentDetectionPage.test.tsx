import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PaymentDetectionPage } from '../PaymentDetectionPage';

const mocks = vi.hoisted(() => ({
  availability: 'unsupported' as 'unsupported' | 'ready',
}));

vi.mock('../../state/PaymentDetectionProvider', () => ({
  usePaymentDetection: () => ({
    availability: mocks.availability,
    candidates: [],
    error: null,
    refresh: vi.fn(),
    status: null,
    supportedApps: [],
    selectedCandidate: null,
    selectedCandidateId: null,
    busyCandidateId: null,
    selectCandidate: vi.fn(),
    ignoreCandidate: vi.fn(),
    confirmCandidate: vi.fn(),
    updateSelectedApps: vi.fn(),
    setRequestedEnabled: vi.fn(),
    requestNotificationPermission: vi.fn(),
    openNotificationAccessSettings: vi.fn(),
    deleteAllCandidates: vi.fn(),
  }),
}));

describe('PaymentDetectionPage', () => {
  it('shows an informational Android-only state in the browser harness without fake setup controls', () => {
    mocks.availability = 'unsupported';
    render(
      <MemoryRouter>
        <PaymentDetectionPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Available in the Android app')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enable detection/i }))
      .not.toBeInTheDocument();
  });
});
