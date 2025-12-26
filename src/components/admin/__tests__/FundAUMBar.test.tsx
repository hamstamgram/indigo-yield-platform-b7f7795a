import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FundAUMBar } from '../FundAUMBar';

// Mock the useFundAUM hook
vi.mock('@/hooks/useFundAUM', () => ({
  useFundAUM: vi.fn(),
}));

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() })),
    })),
    removeChannel: vi.fn(),
  },
}));

import { useFundAUM } from '@/hooks';

const mockUseFundAUM = useFundAUM as ReturnType<typeof vi.fn>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('FundAUMBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders KPI cards for active funds with AUM', async () => {
    const mockFunds = [
      {
        id: '1',
        code: 'IND-BTC',
        name: 'Bitcoin Yield Fund',
        asset: 'BTC',
        fund_class: 'BTC',
        inception_date: '2024-01-01',
        status: 'active' as const,
        latest_aum: 19.9999,
        latest_aum_date: '2024-12-01',
        investor_count: 4,
      },
      {
        id: '2',
        code: 'IND-ETH',
        name: 'Ethereum Yield Fund',
        asset: 'ETH',
        fund_class: 'ETH',
        inception_date: '2024-01-01',
        status: 'active' as const,
        latest_aum: 150.5,
        latest_aum_date: '2024-12-01',
        investor_count: 3,
      },
    ];

    mockUseFundAUM.mockReturnValue({
      funds: mockFunds,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      lastUpdated: new Date(),
    });

    render(<FundAUMBar />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText('ETH')).toBeInTheDocument();
    });
  });

  it('handles loading state with skeletons', () => {
    mockUseFundAUM.mockReturnValue({
      funds: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      lastUpdated: null,
    });

    render(<FundAUMBar />, { wrapper: createWrapper() });

    // Should show skeleton loading state
    const skeletons = document.querySelectorAll('.h-8.w-24');
    expect(skeletons.length).toBe(4);
  });

  it('handles error state gracefully with retry button', async () => {
    const mockRefetch = vi.fn();
    mockUseFundAUM.mockReturnValue({
      funds: [],
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch: mockRefetch,
      lastUpdated: null,
    });

    render(<FundAUMBar />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });

    // Should have retry button
    const retryButton = document.querySelector('button');
    expect(retryButton).toBeInTheDocument();
  });

  it('shows empty state when no funds have AUM', async () => {
    mockUseFundAUM.mockReturnValue({
      funds: [
        {
          id: '1',
          code: 'IND-BTC',
          name: 'Bitcoin Yield Fund',
          asset: 'BTC',
          fund_class: 'BTC',
          inception_date: '2024-01-01',
          status: 'active' as const,
          latest_aum: 0, // No AUM
          latest_aum_date: null,
          investor_count: 0,
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      lastUpdated: new Date(),
    });

    render(<FundAUMBar />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No fund AUM data yet')).toBeInTheDocument();
    });
  });

  it('does not display USD or $ symbols', async () => {
    const mockFunds = [
      {
        id: '1',
        code: 'IND-BTC',
        name: 'Bitcoin Yield Fund',
        asset: 'BTC',
        fund_class: 'BTC',
        inception_date: '2024-01-01',
        status: 'active' as const,
        latest_aum: 19.9999,
        latest_aum_date: '2024-12-01',
        investor_count: 4,
      },
    ];

    mockUseFundAUM.mockReturnValue({
      funds: mockFunds,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      lastUpdated: new Date(),
    });

    render(<FundAUMBar />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    // Should not contain USD or $ anywhere
    const container = document.body;
    expect(container.textContent).not.toContain('$');
    expect(container.textContent).not.toContain('USD');
  });

  it('sorts funds by AUM in descending order', async () => {
    const mockFunds = [
      {
        id: '1',
        code: 'IND-BTC',
        name: 'Bitcoin Yield Fund',
        asset: 'BTC',
        fund_class: 'BTC',
        inception_date: '2024-01-01',
        status: 'active' as const,
        latest_aum: 10, // Lower AUM
        latest_aum_date: '2024-12-01',
        investor_count: 2,
      },
      {
        id: '2',
        code: 'IND-ETH',
        name: 'Ethereum Yield Fund',
        asset: 'ETH',
        fund_class: 'ETH',
        inception_date: '2024-01-01',
        status: 'active' as const,
        latest_aum: 100, // Higher AUM
        latest_aum_date: '2024-12-01',
        investor_count: 5,
      },
    ];

    mockUseFundAUM.mockReturnValue({
      funds: mockFunds,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      lastUpdated: new Date(),
    });

    render(<FundAUMBar />, { wrapper: createWrapper() });

    await waitFor(() => {
      const cards = screen.getAllByText(/BTC|ETH/);
      // ETH (higher AUM) should come before BTC
      const ethIndex = cards.findIndex(el => el.textContent === 'ETH');
      const btcIndex = cards.findIndex(el => el.textContent === 'BTC');
      expect(ethIndex).toBeLessThan(btcIndex);
    });
  });
});
