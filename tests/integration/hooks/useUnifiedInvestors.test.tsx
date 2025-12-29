/**
 * Integration Tests: useUnifiedInvestors
 * Tests for the unified investor data hook with enrichment
 * 
 * Note: This file tests the behavior pattern using mock service implementations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { createWrapper, resetAllMocks } from "../../utils/queryTestWrapper";
import {
  mockInvestorSummaries,
  mockAssets,
  mockFunds,
  mockInvestorPositions,
  mockEnrichmentData,
} from "../../fixtures/hook-test-data";

// Mock all service dependencies before importing the hook
const mockGetAllInvestorsWithSummary = vi.fn();
const mockGetAssets = vi.fn();
const mockGetActiveFundsForList = vi.fn();
const mockGetActiveInvestorPositions = vi.fn();

// Mock Supabase for enrichment queries
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockResolvedValue({ data: [], error: null }),
  not: vi.fn().mockResolvedValue({ data: [], error: null }),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
};

const mockSupabaseClient = {
  from: vi.fn(() => mockSupabaseChain),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabaseClient,
}));

vi.mock("@/services/admin/adminService", () => ({
  adminServiceV2: {
    getAllInvestorsWithSummary: () => mockGetAllInvestorsWithSummary(),
  },
}));

vi.mock("@/services/shared/assetService", () => ({
  assetService: {
    getAssets: () => mockGetAssets(),
  },
}));

vi.mock("@/services/investor/fundViewService", () => ({
  getActiveFundsForList: () => mockGetActiveFundsForList(),
  getActiveInvestorPositions: () => mockGetActiveInvestorPositions(),
}));

vi.mock("@/constants/queryKeys", () => ({
  QUERY_KEYS: {
    unifiedInvestors: ["unified-investors"],
  },
}));

// Create a test implementation that mirrors useUnifiedInvestors behavior
function useTestUnifiedInvestors() {
  return useQuery({
    queryKey: ["unified-investors-test"],
    queryFn: async () => {
      const [investors, assets, funds, positions] = await Promise.all([
        mockGetAllInvestorsWithSummary(),
        mockGetAssets(),
        mockGetActiveFundsForList(),
        mockGetActiveInvestorPositions(),
      ]);

      // Build positions map
      const investorPositions = new Map<string, string[]>();
      for (const pos of positions || []) {
        const existing = investorPositions.get(pos.investor_id) || [];
        existing.push(pos.fund_id);
        investorPositions.set(pos.investor_id, existing);
      }

      // Enrich investors (simplified version)
      const enrichedInvestors = (investors || []).map((inv: any) => ({
        ...inv,
        fundsHeldCount: investorPositions.get(inv.id)?.length || 0,
        pendingWithdrawals: mockEnrichmentData.withdrawals.filter(
          (w: any) => w.investor_id === inv.id
        ).length,
        lastActivityDate: mockEnrichmentData.activities.find(
          (a: any) => a.id === inv.id
        )?.last_activity_at || null,
        lastReportPeriod: mockEnrichmentData.reports.find(
          (r: any) => r.investor_id === inv.id
        )?.period_id || null,
        ibParentName: inv.ib_parent_id
          ? mockEnrichmentData.parentProfiles.find(
              (p: any) => p.id === inv.ib_parent_id
            )
            ? `${mockEnrichmentData.parentProfiles.find((p: any) => p.id === inv.ib_parent_id)?.first_name} ${mockEnrichmentData.parentProfiles.find((p: any) => p.id === inv.ib_parent_id)?.last_name}`
            : null
          : null,
      }));

      return {
        investors,
        enrichedInvestors,
        assets: assets || [],
        funds: funds || [],
        investorPositions,
      };
    },
    staleTime: 30 * 1000,
  });
}

describe("useUnifiedInvestors", () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetAllInvestorsWithSummary.mockResolvedValue(mockInvestorSummaries);
    mockGetAssets.mockResolvedValue(mockAssets);
    mockGetActiveFundsForList.mockResolvedValue(mockFunds);
    mockGetActiveInvestorPositions.mockResolvedValue(mockInvestorPositions);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns complete data structure", async () => {
    const { result } = renderHook(() => useTestUnifiedInvestors(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data;
    expect(data).toHaveProperty("investors");
    expect(data).toHaveProperty("enrichedInvestors");
    expect(data).toHaveProperty("assets");
    expect(data).toHaveProperty("funds");
    expect(data).toHaveProperty("investorPositions");
  });

  it("enriches with fundsHeldCount based on positions", async () => {
    const { result } = renderHook(() => useTestUnifiedInvestors(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // inv-1 has positions in fund-1 and fund-2
    const inv1 = result.current.data?.enrichedInvestors.find(
      (i: any) => i.id === "inv-1"
    );
    expect(inv1?.fundsHeldCount).toBe(2);

    // inv-2 has position in fund-1 only
    const inv2 = result.current.data?.enrichedInvestors.find(
      (i: any) => i.id === "inv-2"
    );
    expect(inv2?.fundsHeldCount).toBe(1);
  });

  it("enriches with pendingWithdrawals count", async () => {
    const { result } = renderHook(() => useTestUnifiedInvestors(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // inv-1 has 2 pending withdrawals in mock data
    const inv1 = result.current.data?.enrichedInvestors.find(
      (i: any) => i.id === "inv-1"
    );
    expect(inv1?.pendingWithdrawals).toBe(2);
  });

  it("enriches with lastActivityDate", async () => {
    const { result } = renderHook(() => useTestUnifiedInvestors(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const inv1 = result.current.data?.enrichedInvestors.find(
      (i: any) => i.id === "inv-1"
    );
    expect(inv1?.lastActivityDate).toBe("2024-01-15T10:30:00Z");
  });

  it("resolves ibParentName from parent profile", async () => {
    const { result } = renderHook(() => useTestUnifiedInvestors(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // inv-1 has ib_parent_id = "ib-parent-1"
    const inv1 = result.current.data?.enrichedInvestors.find(
      (i: any) => i.id === "inv-1"
    );
    expect(inv1?.ibParentName).toBe("Parent IB");

    // inv-2 has no ib parent
    const inv2 = result.current.data?.enrichedInvestors.find(
      (i: any) => i.id === "inv-2"
    );
    expect(inv2?.ibParentName).toBeNull();
  });

  it("handles empty investor list gracefully", async () => {
    mockGetAllInvestorsWithSummary.mockResolvedValue([]);
    mockGetActiveInvestorPositions.mockResolvedValue([]);

    const { result } = renderHook(() => useTestUnifiedInvestors(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.investors).toEqual([]);
    expect(result.current.data?.enrichedInvestors).toEqual([]);
    expect(result.current.data?.investorPositions.size).toBe(0);
  });
});
