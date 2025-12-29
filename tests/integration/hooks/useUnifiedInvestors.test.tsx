/**
 * Integration Tests: useUnifiedInvestors
 * Tests for the unified investor data hook with enrichment
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper, resetAllMocks } from "../../utils/queryTestWrapper";
import {
  mockInvestorSummaries,
  mockAssets,
  mockFunds,
  mockInvestorPositions,
  mockEnrichmentData,
} from "../../fixtures/hook-test-data";

// Mock services - matching actual imports from useUnifiedInvestors
const mockAdminServiceV2 = {
  getAllInvestorsWithSummary: vi.fn(),
};

const mockAssetService = {
  getAssets: vi.fn(),
};

const mockGetActiveFundsForList = vi.fn();
const mockGetActiveInvestorPositions = vi.fn();

// Mock Supabase for enrichment queries
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabaseClient,
}));

vi.mock("@/services/admin/adminService", () => ({
  adminServiceV2: mockAdminServiceV2,
}));

vi.mock("@/services/shared/assetService", () => ({
  assetService: mockAssetService,
}));

vi.mock("@/services/investor/fundViewService", () => ({
  getActiveFundsForList: mockGetActiveFundsForList,
  getActiveInvestorPositions: mockGetActiveInvestorPositions,
}));

// Mock query keys
vi.mock("@/constants/queryKeys", () => ({
  QUERY_KEYS: {
    unifiedInvestors: ["unified-investors"],
  },
}));

// Import hook after mocking
import { useUnifiedInvestors } from "@/hooks/data/useUnifiedInvestors";

describe("useUnifiedInvestors", () => {
  beforeEach(() => {
    resetAllMocks();
    
    // Default mock implementations
    mockAdminServiceV2.getAllInvestorsWithSummary.mockResolvedValue(mockInvestorSummaries);
    mockAssetService.getAssets.mockResolvedValue(mockAssets);
    mockGetActiveFundsForList.mockResolvedValue(mockFunds);
    mockGetActiveInvestorPositions.mockResolvedValue(mockInvestorPositions);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns complete data structure", async () => {
    // Mock enrichment queries
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockSupabaseClient.from.mockReturnValue(mockChain);

    const { result } = renderHook(() => useUnifiedInvestors(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });

    expect(result.current.data).toHaveProperty("investors");
    expect(result.current.data).toHaveProperty("enrichedInvestors");
    expect(result.current.data).toHaveProperty("assets");
    expect(result.current.data).toHaveProperty("funds");
    expect(result.current.data).toHaveProperty("investorPositions");
  });

  it("enriches with fundsHeldCount based on positions map", async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockSupabaseClient.from.mockReturnValue(mockChain);

    const { result } = renderHook(() => useUnifiedInvestors(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });

    const enrichedInvestors = result.current.data?.enrichedInvestors || [];
    const inv1 = enrichedInvestors.find((inv) => inv.id === "inv-1");
    const inv2 = enrichedInvestors.find((inv) => inv.id === "inv-2");

    // inv-1 has positions in fund-1 and fund-2
    expect(inv1?.fundsHeldCount).toBe(2);
    // inv-2 has position in fund-1 only
    expect(inv2?.fundsHeldCount).toBe(1);
  });

  it("enriches with lastActivityDate from profiles", async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockEnrichmentData.activities, error: null }),
    };
    mockSupabaseClient.from.mockReturnValue(mockChain);

    const { result } = renderHook(() => useUnifiedInvestors(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });

    const enrichedInvestors = result.current.data?.enrichedInvestors || [];
    const inv1 = enrichedInvestors.find((inv) => inv.id === "inv-1");

    // Should have last activity date from enrichment
    expect(inv1?.lastActivityDate).toBeDefined();
  });

  it("enriches with pendingWithdrawals count", async () => {
    // Mock withdrawal count query
    let callCount = 0;
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Withdrawals query - return counts
          return Promise.resolve({ 
            data: mockEnrichmentData.withdrawals, 
            error: null,
            count: 2,
          });
        }
        return Promise.resolve({ data: [], error: null });
      }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockSupabaseClient.from.mockReturnValue(mockChain);

    const { result } = renderHook(() => useUnifiedInvestors(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });

    const enrichedInvestors = result.current.data?.enrichedInvestors || [];
    const inv1 = enrichedInvestors.find((inv) => inv.id === "inv-1");

    expect(inv1?.pendingWithdrawals).toBeGreaterThanOrEqual(0);
  });

  it("resolves ibParentName via secondary profile lookup", async () => {
    // Mock profile lookup for IB parent
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockImplementation((column) => {
        if (column === "id") {
          // Parent profile lookup
          return Promise.resolve({ 
            data: mockEnrichmentData.parentProfiles, 
            error: null,
          });
        }
        return Promise.resolve({ data: [], error: null });
      }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockSupabaseClient.from.mockReturnValue(mockChain);

    const { result } = renderHook(() => useUnifiedInvestors(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });

    const enrichedInvestors = result.current.data?.enrichedInvestors || [];
    const inv1 = enrichedInvestors.find((inv) => inv.id === "inv-1");

    // inv-1 has ib_parent_id, should have resolved name
    expect(inv1?.ibParentName).toBeDefined();
  });

  it("handles empty investor list gracefully", async () => {
    mockAdminServiceV2.getAllInvestorsWithSummary.mockResolvedValue([]);
    mockGetActiveInvestorPositions.mockResolvedValue([]);

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockSupabaseClient.from.mockReturnValue(mockChain);

    const { result } = renderHook(() => useUnifiedInvestors(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });

    expect(result.current.data?.investors).toEqual([]);
    expect(result.current.data?.enrichedInvestors).toEqual([]);
    expect(result.current.data?.investorPositions).toBeDefined();
  });
});
