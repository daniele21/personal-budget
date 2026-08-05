import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PortalApp } from '../PortalApp';

describe('PortalApp', () => {
  beforeAll(() => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });
  afterAll(() => vi.unstubAllGlobals());
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('renders a complete product landing page with public actions', () => {
    window.history.replaceState({}, '', '/');
    render(<PortalApp />);

    expect(screen.getByRole('heading', { name: /Know what you can spend/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Request early access/i })[0]).toHaveAttribute('href', expect.stringContaining('mailto:'));
    expect(screen.getByRole('navigation', { name: 'Public navigation' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Aura Android home showing August budget/i })).toHaveAttribute('src', '/landing/aura-home.png');
  });

  it('shows Daniele safe to spend before and after separating the furniture extra', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/');
    render(<PortalApp />);

    expect(screen.getByRole('heading', { name: 'See the answer, not just another chart.' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Home in Actual view/i })).toHaveAttribute('src', '/landing/aura-home.png');
    expect(screen.getByText('€622 available')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Net of extras' }));
    expect(screen.getByRole('img', { name: /Home in Net view/i })).toHaveAttribute('src', '/landing/aura-home-net.png');
    expect(screen.getByText('€1,760.23')).toBeInTheDocument();
  });

  it('slides through the four concrete analysis use cases', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/');
    render(<PortalApp />);

    await user.click(screen.getByRole('tab', { name: 'Budget status' }));
    expect(screen.getByRole('img', { name: /Budgets screen showing category limits/i })).toHaveAttribute('src', '/landing/aura-budgets.png');

    await user.click(screen.getByRole('button', { name: 'Show next use case' }));
    expect(screen.getByRole('img', { name: /Groceries category report/i })).toHaveAttribute('src', '/landing/aura-reports-category-groceries.png');

    await user.click(screen.getByRole('tab', { name: 'Month vs month' }));
    expect(screen.getByRole('img', { name: /Compare report explaining/i })).toHaveAttribute('src', '/landing/aura-reports-compare.png');

    await user.click(screen.getByRole('button', { name: 'Show previous use case' }));
    expect(screen.getByRole('tab', { name: 'Where to cut' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the authentic payment detection UI and supported sources', () => {
    window.history.replaceState({}, '', '/');
    render(<PortalApp />);

    expect(screen.getByRole('heading', { name: /A payment becomes a suggestion/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Payments to review showing local suggestions/i })).toHaveAttribute('src', '/landing/aura-payment-detection.png');
    expect(screen.getByText(/Intesa Sanpaolo Mobile, Google Wallet and PayPal/i)).toBeInTheDocument();
  });

  it('renders the public privacy page without authentication', () => {
    window.history.replaceState({}, '', '/privacy');
    render(<PortalApp />);

    expect(screen.getByRole('heading', { name: /Your financial life is not our dataset/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Optional cloud recovery' })).toBeInTheDocument();
  });
});
