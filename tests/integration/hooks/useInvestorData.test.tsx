/**
 * Integration Tests: useInvestorData
 * Tests for useInvestorList and useUpdateInvestorStatus hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapper, createTestQueryClient, resetAllMocks } from "../../utils/queryTestWrapper";
import { mockInvestorListItems } from "../../fixtures/hook-test-data";

// Mock toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock("sonner", () => ({
  toast: mockToast,
}));

// Mock cache invalidation
const mockInvalidateInvestorData = vi.fn();

vi.mock("@/utils/cacheInvalidation", () => ({
  invalidateInvestorData: mockInvalidateInvestorData,
}));

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

// Mock query keys
vi.mock("@/constants/queryKeys", () => ({
  QUERY_KEYS: {
    investorList: ["investor-list"],
  },
}));

// Import hooks after mocking
import { useInvestorList, useUpdateInvestorStatus } from "@/hooks/data/useInvestorData";

describe("useInvestorData", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============ useInvestorList Tests ============
  describe("useInvestorList", () => {
    it("fetches profiles with is_admin: false filter", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockInvestorListItems, error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useInvestorList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("profiles");
      expect(mockChain.eq).toHaveBeenCalledWith("is_admin", false);
    });

    it("orders by created_at descending", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockInvestorListItems, error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useInvestorList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockChain.order).toHaveBeenCalledWith("created_at", { ascending: false });
    });

    it("returns correct InvestorListItem shape", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockInvestorListItems, error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useInvestorList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(3);
      
      const firstItem = result.current.data?.[0];
      expect(firstItem).toHaveProperty("id");
      expect(firstItem).toHaveProperty("email");
      expect(firstItem).toHaveProperty("first_name");
      expect(firstItem).toHaveProperty("last_name");
      expect(firstItem).toHaveProperty("status");
      expect(firstItem).toHaveProperty("is_admin");
      expect(firstItem).toHaveProperty("account_type");
      expect(firstItem).toHaveProperty("created_at");
    });
  });

  // ============ useUpdateInvestorStatus Tests ============
  describe("useUpdateInvestorStatus", () => {
    it("updates profile with status and timestamp", async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useUpdateInvestorStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ investorId: "inv-1", status: "inactive" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("profiles");
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "inactive",
          updated_at: expect.any(String),
        })
      );
      expect(mockChain.eq).toHaveBeenCalledWith("id", "inv-1");
    });

    it("shows success toast on success", async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useUpdateInvestorStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ investorId: "inv-1", status: "inactive" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockToast.success).toHaveBeenCalledWith("Investor updated");
    });

    it("calls invalidateInvestorData on success", async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useUpdateInvestorStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ investorId: "inv-1", status: "inactive" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvalidateInvestorData).toHaveBeenCalledWith(
        expect.any(Object), // QueryClient
        "inv-1"
      );
    });

    it("shows error toast on failure", async () => {
      const mockError = new Error("Database connection failed");
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: mockError }),
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useUpdateInvestorStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ investorId: "inv-1", status: "inactive" });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to update investor")
      );
    });
  });
});
