import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  acknowledge: vi.fn(),
  onAppUrl: null as null | ((path: string) => void),
  remove: vi.fn(),
}));

vi.mock('../appRuntimeService', () => ({
  acknowledgePendingAppUrl: mocks.acknowledge,
  subscribeToAppRuntime: vi.fn(async (onAppUrl: (path: string) => void) => {
    mocks.onAppUrl = onAppUrl;
    return { remove: mocks.remove };
  }),
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
    mocks.onAppUrl = null;
  });

  it('holds an allowlisted target through login and acknowledges after navigation', async () => {
    const view = render(<TestApp isLoggedIn={false} />);
    await act(async () => undefined);

    act(() => mocks.onAppUrl?.('/data'));
    expect(screen.getByLabelText('current path')).toHaveTextContent('/');
    expect(mocks.acknowledge).not.toHaveBeenCalled();

    view.rerender(<TestApp isLoggedIn />);
    expect(screen.getByLabelText('current path')).toHaveTextContent('/data');
    expect(mocks.acknowledge).toHaveBeenCalledOnce();
  });
});
