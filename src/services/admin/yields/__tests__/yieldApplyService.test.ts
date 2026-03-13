import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: vi.fn(() =>
        Promise.resolve({ data: { name: "Test Fund", asset: "USDT", code: "USDT" }, error: null })
      ),
    })),
  },
}));

const mockCallRPC = vi.fn();
vi.mock("@/lib/supabase/typedRPC", () => ({
  callRPC: (...args: unknown[]) => mockCallRPC(...args),
}));

vi.mock("@/services/notifications", () => ({
  yieldNotifications: { notifyYieldDistributed: vi.fn() },
}));

vi.mock("@/services/admin/yields/yieldCrystallizationService", () => ({
  finalizeMonthYield: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

describe("applyYieldDistribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCallRPC.mockResolvedValue({
      data: {
        distribution_id: "dist-1",
        gross_yield: "1000",
        total_net: "700",
        total_fees: "250",
        total_ib: "50",
        dust: "0",
        investor_count: 2,
        allocations: [],
      },
      error: null,
    });
  });

  it("defaults purpose to 'transaction' not 'reporting'", async () => {
    const { applyYieldDistribution } = await import("@/services/admin/yields/yieldApplyService");

    await applyYieldDistribution(
      {
        fundId: "fund-1",
        targetDate: new Date("2026-03-05"),
        newTotalAUM: "10000000",
        distributionDate: new Date("2026-03-05"),
      },
      "admin-1"
      // No purpose param - should default to "transaction"
    );

    expect(mockCallRPC).toHaveBeenCalledWith(
      "apply_segmented_yield_distribution_v5",
      expect.objectContaining({
        p_purpose: "transaction",
      })
    );
  });

  it("uses provided distributionDate regardless of purpose", async () => {
    const { applyYieldDistribution } = await import("@/services/admin/yields/yieldApplyService");

    await applyYieldDistribution(
      {
        fundId: "fund-1",
        targetDate: new Date("2026-03-31"),
        newTotalAUM: "10000000",
        distributionDate: new Date("2026-03-15"),
      },
      "admin-1",
      "reporting"
    );

    // Should use the provided distributionDate (Mar 15), NOT force to period end (Mar 31)
    expect(mockCallRPC).toHaveBeenCalledWith(
      "apply_segmented_yield_distribution_v5",
      expect.objectContaining({
        p_distribution_date: "2026-03-15",
      })
    );
  });

  it("falls back to targetDate when distributionDate is undefined", async () => {
    const { applyYieldDistribution } = await import("@/services/admin/yields/yieldApplyService");

    await applyYieldDistribution(
      {
        fundId: "fund-1",
        targetDate: new Date("2026-03-05"),
        newTotalAUM: "10000000",
      },
      "admin-1",
      "transaction"
    );

    expect(mockCallRPC).toHaveBeenCalledWith(
      "apply_segmented_yield_distribution_v5",
      expect.objectContaining({
        p_distribution_date: "2026-03-05",
      })
    );
  });

  it("throws on zero or negative AUM", async () => {
    const { applyYieldDistribution } = await import("@/services/admin/yields/yieldApplyService");

    await expect(
      applyYieldDistribution(
        {
          fundId: "fund-1",
          targetDate: new Date("2026-03-05"),
          newTotalAUM: "0",
          distributionDate: new Date("2026-03-05"),
        },
        "admin-1"
      )
    ).rejects.toThrow("Recorded AUM must be a positive number");
  });
});
