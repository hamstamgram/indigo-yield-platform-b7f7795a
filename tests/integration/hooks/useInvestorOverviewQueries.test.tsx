/**
 * Integration Tests: useInvestorOverviewQueries
 * Tests for useRecentInvestorTransactions, usePendingWithdrawalsCount, useLastStatementPeriod
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper, createTestQueryClient, resetAllMocks } from "../../utils/queryTestWrapper";
import {
  mockAuthenticatedUser,
  mockRecentTransactions,
  mockPerformanceWithPeriod,
} from "../../fixtures/hook-test-data";

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabaseClient,
}));

// Import hooks after mocking
import {
  useRecentInvestorTransactions,
  usePendingWithdrawalsCount,
  useLastStatementPeriod,
} from "@/hooks/data/useInvestorOverviewQueries";

describe("useInvestorOverviewQueries", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============ useRecentInvestorTransactions Tests ============
  describe("useRecentInvestorTransactions", () => {
    it("returns empty array when no user authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useRecentInvestorTransactions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it("fetches transactions with correct filters", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null,
      });

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockRecentTransactions.slice(0, 5), error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useRecentInvestorTransactions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("transactions_v2");
      expect(mockChain.eq).toHaveBeenCalledWith("investor_id", mockAuthenticatedUser.id);
      expect(mockChain.eq).toHaveBeenCalledWith("visibility_scope", "investor_visible");
      expect(mockChain.order).toHaveBeenCalledWith("tx_date", { ascending: false });
      expect(result.current.data).toEqual(mockRecentTransactions.slice(0, 5));
    });

    it("respects custom limit parameter", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null,
      });

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockRecentTransactions.slice(0, 3), error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useRecentInvestorTransactions(3), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockChain.limit).toHaveBeenCalledWith(3);
      expect(result.current.data?.length).toBe(3);
    });
  });

  // ============ usePendingWithdrawalsCount Tests ============
  describe("usePendingWithdrawalsCount", () => {
    it("returns 0 when no user authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => usePendingWithdrawalsCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe(0);
    });

    it("counts only pending and processing status", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null,
      });

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ count: 2, error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => usePendingWithdrawalsCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("withdrawal_requests");
      expect(mockChain.in).toHaveBeenCalledWith("status", ["pending", "processing"]);
    });

    it("returns correct count from supabase", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null,
      });

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ count: 5, error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => usePendingWithdrawalsCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe(5);
    });
  });

  // ============ useLastStatementPeriod Tests ============
  describe("useLastStatementPeriod", () => {
    it("returns null when no user authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useLastStatementPeriod(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeNull();
    });

    it("returns null when no performance records exist", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null,
      });

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useLastStatementPeriod(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeNull();
    });

    it("returns period_name from most recent reporting record", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null,
      });

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPerformanceWithPeriod, error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useLastStatementPeriod(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("investor_fund_performance");
      expect(mockChain.eq).toHaveBeenCalledWith("investor_id", mockAuthenticatedUser.id);
      expect(mockChain.eq).toHaveBeenCalledWith("purpose", "reporting");
      expect(result.current.data).toBe("January 2024");
    });
  });
});
