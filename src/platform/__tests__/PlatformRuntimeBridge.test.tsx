import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  acknowledge: vi.fn(),
  onAppTarget: null as null | ((target:
    | { kind: 'route'; path: string }
    | { kind: 'paymentCandidate'; candidateId: string }) => void),
  publishCandidateTarget: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../appRuntimeService', () => ({
  acknowledgePendingAppUrl: mocks.acknowledge,
  subscribeToAppRuntime: vi.fn(async (onAppTarget: typeof mocks.onAppTarget) => {
    mocks.onAppTarget = onAppTarget;
    return { remove: mocks.remove };
  }),
}));

vi.mock('../paymentCandidateTarget', () => ({
  publishPaymentCandidateTarget: mocks.publishCandidateTarget,
}));

import { PlatformRuntimeBridge } from '../PlatformRuntimeBridge';

function CurrentPath() {
  return <output aria-label="current path">{useLocation().pathname}</output>;
}

function TestApp({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <PlatformRuntimeBridge isLoggedIn={isLoggedIn} />
      <CurrentPath />
    </MemoryRouter>
  );
}

describe('PlatformRuntimeBridge', () => {
  beforeEach(() => {
    mocks.acknowledge.mockReset();
    mocks.acknowledge.mockResolvedValue(undefined);
    mocks.remove.mockReset();
    mocks.onAppTarget = null;
    mocks.publishCandidateTarget.mockReset();
  });

  it('holds an allowlisted target through login and acknowledges after navigation', async () => {
    const view = render(<TestApp isLoggedIn={false} />);
    await act(async () => undefined);

    act(() => mocks.onAppTarget?.({ kind: 'route', path: '/data' }));
    expect(screen.getByLabelText('current path')).toHaveTextContent('/');
    expect(mocks.acknowledge).not.toHaveBeenCalled();

    view.rerender(<TestApp isLoggedIn />);
    expect(screen.getByLabelText('current path')).toHaveTextContent('/data');
    expect(mocks.acknowledge).toHaveBeenCalledOnce();
  });

  it('holds an opaque candidate target through login without URL financial data', async () => {
    const view = render(<TestApp isLoggedIn={false} />);
    await act(async () => undefined);

    act(() =>
      mocks.onAppTarget?.({
        kind: 'paymentCandidate',
        candidateId: 'AbCdEfGhIjKlMnOpQrStUvWx',
      }),
    );
    expect(mocks.publishCandidateTarget).not.toHaveBeenCalled();

    view.rerender(<TestApp isLoggedIn />);
    expect(mocks.publishCandidateTarget).toHaveBeenCalledWith(
      'AbCdEfGhIjKlMnOpQrStUvWx',
      mocks.acknowledge,
    );
    expect(mocks.acknowledge).not.toHaveBeenCalled();
  });
});
