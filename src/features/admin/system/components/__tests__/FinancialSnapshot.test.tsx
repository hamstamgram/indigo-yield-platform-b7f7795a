/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FinancialSnapshot } from "../FinancialSnapshot";

// Mock the useFundAUM hook
vi.mock("@/hooks/data/shared/useFundAUM", () => ({
  useFundAUM: vi.fn(),
}));

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() })),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

import { useFundAUM } from "@/hooks";

const mockUseFundAUM = vi.mocked(useFundAUM);

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

describe("FinancialSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders fund cards when API returns data", async () => {
    const mockFunds = [
      {
        id: "1",
        code: "IND-BTC",
        name: "Bitcoin Yield Fund",
        asset: "BTC",
        fund_class: "BTC",
        inception_date: "2024-01-01",
        status: "active" as const,
        latest_aum: 19.9999,
        latest_aum_date: "2024-12-01",
        investor_count: 4,
      },
      {
        id: "2",
        code: "IND-ETH",
        name: "Ethereum Yield Fund",
        asset: "ETH",
        fund_class: "ETH",
        inception_date: "2024-01-01",
        status: "active" as const,
        latest_aum: 150.5,
        latest_aum_date: "2024-12-01",
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

    render(<FinancialSnapshot />, { wrapper: createWrapper() });

    // Should render Fund Financials header
    expect(screen.getByText("Fund Financials")).toBeInTheDocument();

    // Should render fund cards
    await waitFor(() => {
      expect(screen.getByText("BTC Fund")).toBeInTheDocument();
      expect(screen.getByText("ETH Fund")).toBeInTheDocument();
    });
  });

  it("shows error state when API fails", async () => {
    mockUseFundAUM.mockReturnValue({
      funds: [],
      isLoading: false,
      isError: true,
      error: new Error("Network error"),
      refetch: vi.fn(),
      lastUpdated: null,
    });

    render(<FinancialSnapshot />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Failed to Load Fund Data")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });
  });

  it("shows empty state when no active funds exist", async () => {
    mockUseFundAUM.mockReturnValue({
      funds: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      lastUpdated: new Date(),
    });

    render(<FinancialSnapshot />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No Active Funds")).toBeInTheDocument();
    });
  });

  it("shows loading state while fetching", () => {
    mockUseFundAUM.mockReturnValue({
      funds: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      lastUpdated: null,
    });

    render(<FinancialSnapshot />, { wrapper: createWrapper() });

    // Should show skeleton loading state
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("does not display USD or $ symbols in fund cards", async () => {
    const mockFunds = [
      {
        id: "1",
        code: "IND-BTC",
        name: "Bitcoin Yield Fund",
        asset: "BTC",
        fund_class: "BTC",
        inception_date: "2024-01-01",
        status: "active" as const,
        latest_aum: 19.9999,
        latest_aum_date: "2024-12-01",
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

    render(<FinancialSnapshot />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("BTC Fund")).toBeInTheDocument();
    });

    // Should not contain USD or $ anywhere
    const container = document.body;
    expect(container.textContent).not.toContain("$");
    expect(container.textContent).not.toContain("USD");
  });
});
