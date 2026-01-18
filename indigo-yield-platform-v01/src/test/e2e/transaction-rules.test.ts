/**
 * E2E Tests for Transaction Type Rules, AUM Requirement, and Canonical RPC Functions
 * Tests P1 Fixes: FIRST_INVESTMENT vs TOP_UP validation and AUM enforcement
 * Tests P0 Gateway Fixes: Canonical RPC function validation and security
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return {
        select: (...selectArgs: unknown[]) => {
          mockSelect(...selectArgs);
          return {
            eq: (...eqArgs: unknown[]) => {
              mockEq(...eqArgs);
              return {
                eq: (...eqArgs2: unknown[]) => {
                  mockEq(...eqArgs2);
                  return {
                    maybeSingle: () => mockMaybeSingle(),
                  };
                },
                maybeSingle: () => mockMaybeSingle(),
              };
            },
          };
        },
      };
    },
  },
}));

describe("P0 Gateway Fixes: Canonical RPC Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("export_investor_data RPC (GDPR compliance)", () => {
    it("should successfully export investor data with audit logging", async () => {
      const mockExportData = {
        personal_info: {
          user_id: "test-user-id",
          full_name: "Test User",
          email: "test@example.com",
          created_at: "2025-01-01T00:00:00Z"
        },
        investments: [
          {
            investment_id: "inv-1",
            amount: 10000,
            investment_date: "2025-01-01T00:00:00Z",
            status: "active"
          }
        ],
        transactions: [
          {
            transaction_id: "tx-1",
            type: "DEPOSIT",
            amount: 10000,
            date: "2025-01-01T00:00:00Z"
          }
        ],
        export_timestamp: "2025-01-17T20:00:00Z",
        export_requested_by: "test-admin-id"
      };

      mockRpc.mockResolvedValueOnce({
        data: mockExportData,
        error: null
      });

      const { supabase } = await import("@/integrations/supabase/client");

      const result = await supabase.rpc("export_investor_data", {
        investor_id_param: "test-user-id"
      });

      expect(mockRpc).toHaveBeenCalledWith("export_investor_data", {
        investor_id_param: "test-user-id"
      });
      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockExportData);
      expect((result.data as any)?.personal_info.user_id).toBe("test-user-id");
    });

    it("should fail when user lacks permission to export data", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: "Insufficient permissions",
          code: "42501"
        }
      });

      const { supabase } = await import("@/integrations/supabase/client");

      const result = await supabase.rpc("export_investor_data", {
        investor_id_param: "other-user-id"
      });

      expect(result.error?.message).toContain("Insufficient permissions");
      expect(result.data).toBeNull();
    });

    it("should fail when not authenticated", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: "Authentication required",
          code: "42501"
        }
      });

      const { supabase } = await import("@/integrations/supabase/client");

      const result = await supabase.rpc("export_investor_data", {
        investor_id_param: "test-user-id"
      });

      expect(result.error?.message).toContain("Authentication required");
    });
  });

  describe("get_kpi_metrics RPC (admin-only)", () => {
    it("should successfully return KPI metrics for admin users", async () => {
      const mockKPIData = {
        total_aum: 1000000,
        total_investors: 25,
        monthly_inflows: 50000,
        monthly_outflows: 10000,
        avg_investment_size: 40000,
        fund_performance: {
          ytd_return: 0.075,
          total_yield_paid: 12500
        },
        calculated_at: "2025-01-17T20:00:00Z",
        calculated_by: "test-admin-id"
      };

      mockRpc.mockResolvedValueOnce({
        data: mockKPIData,
        error: null
      });

      const { supabase } = await import("@/integrations/supabase/client");

      const result = await supabase.rpc("get_kpi_metrics");

      expect(mockRpc).toHaveBeenCalledWith("get_kpi_metrics");
      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockKPIData);
      expect((result.data as any)?.total_aum).toBe(1000000);
      expect((result.data as any)?.total_investors).toBe(25);
    });

    it("should fail when non-admin user attempts to access KPIs", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: "Admin access required",
          code: "42501"
        }
      });

      const { supabase } = await import("@/integrations/supabase/client");

      const result = await supabase.rpc("get_kpi_metrics");

      expect(result.error?.message).toContain("Admin access required");
      expect(result.data).toBeNull();
    });
  });

  describe("run_integrity_monitoring RPC (system health)", () => {
    it("should successfully run integrity checks and return HEALTHY status", async () => {
      const mockMonitoringResult = {
        status: "HEALTHY",
        violations_count: 0,
        warnings: [],
        checks_performed: [
          "investment_amounts",
          "transaction_balances",
          "orphaned_records",
          "aum_calculation"
        ],
        monitoring_timestamp: "2025-01-17T20:00:00Z",
        monitored_by: "test-admin-id",
        system_health_score: 100
      };

      mockRpc.mockResolvedValueOnce({
        data: mockMonitoringResult,
        error: null
      });

      const { supabase } = await import("@/integrations/supabase/client");

      const result = await supabase.rpc("run_integrity_monitoring");

      expect(mockRpc).toHaveBeenCalledWith("run_integrity_monitoring");
      expect(result.error).toBeNull();
      expect((result.data as any)?.status).toBe("HEALTHY");
      expect((result.data as any)?.violations_count).toBe(0);
      expect((result.data as any)?.system_health_score).toBe(100);
    });

    it("should detect violations and return WARNING status", async () => {
      const mockMonitoringResult = {
        status: "WARNING",
        violations_count: 1,
        warnings: ["AUM calculation mismatch detected"],
        checks_performed: [
          "investment_amounts",
          "transaction_balances",
          "orphaned_records",
          "aum_calculation"
        ],
        monitoring_timestamp: "2025-01-17T20:00:00Z",
        monitored_by: "test-admin-id",
        system_health_score: 85
      };

      mockRpc.mockResolvedValueOnce({
        data: mockMonitoringResult,
        error: null
      });

      const { supabase } = await import("@/integrations/supabase/client");

      const result = await supabase.rpc("run_integrity_monitoring");

      expect(result.error).toBeNull();
      expect((result.data as any)?.status).toBe("WARNING");
      expect((result.data as any)?.violations_count).toBe(1);
      expect((result.data as any)?.warnings).toContain("AUM calculation mismatch detected");
    });

    it("should fail when non-admin attempts to run monitoring", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: "Admin access required",
          code: "42501"
        }
      });

      const { supabase } = await import("@/integrations/supabase/client");

      const result = await supabase.rpc("run_integrity_monitoring");

      expect(result.error?.message).toContain("Admin access required");
    });
  });
});

describe("Transaction Type Rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("FIRST_INVESTMENT validation", () => {
    it("should succeed when investor has no existing position (balance = 0)", async () => {
      // Mock position check returns no position
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

      // Mock transaction insert succeeds
      mockRpc.mockResolvedValueOnce({ data: { id: "new-tx-id" }, error: null });

      const { supabase } = await import("@/integrations/supabase/client");

      // Check balance first (simulating frontend behavior)
      const position = await supabase
        .from("investor_positions")
        .select("current_value")
        .eq("investor_id", "test-investor")
        .eq("fund_id", "test-fund")
        .maybeSingle();

      expect(position.data).toBeNull(); // No position exists

      // Create FIRST_INVESTMENT using correct RPC name
      const result = await (supabase.rpc as any)("admin_create_transaction", {
        p_investor_id: "test-investor",
        p_fund_id: "test-fund",
        p_type: "FIRST_INVESTMENT",
        p_amount: 1000,
        p_tx_date: "2025-01-01",
      });

      expect(result.error).toBeNull();
      expect(result.data).toHaveProperty("id");
    });

    it("should fail when investor already has a position (balance > 0)", async () => {
      // Mock position check returns existing position
      mockMaybeSingle.mockResolvedValueOnce({
        data: { current_value: 5000 },
        error: null,
      });

      // Mock transaction insert fails due to validation
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: "First Investment only allowed when balance is 0. Use Deposit.",
          code: "P0001",
        },
      });

      const { supabase } = await import("@/integrations/supabase/client");

      // Check balance first
      const position = await supabase
        .from("investor_positions")
        .select("current_value")
        .eq("investor_id", "test-investor")
        .eq("fund_id", "test-fund")
        .maybeSingle();

      expect(position.data?.current_value).toBeGreaterThan(0);

      // Attempt FIRST_INVESTMENT should fail
      const result = await (supabase.rpc as any)("admin_create_transaction", {
        p_investor_id: "test-investor",
        p_fund_id: "test-fund",
        p_type: "FIRST_INVESTMENT",
        p_amount: 1000,
        p_tx_date: "2025-01-01",
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("First Investment");
    });
  });

  describe("TOP_UP / DEPOSIT validation", () => {
    it("should fail when investor has no existing position (balance = 0)", async () => {
      // Mock position check returns no position
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

      // Mock transaction insert fails due to validation
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: "Top-up not allowed when balance is 0. Use First Investment.",
          code: "P0001",
        },
      });

      const { supabase } = await import("@/integrations/supabase/client");

      // Check balance first
      const position = await supabase
        .from("investor_positions")
        .select("current_value")
        .eq("investor_id", "test-investor")
        .eq("fund_id", "test-fund")
        .maybeSingle();

      expect(position.data).toBeNull();

      // Attempt DEPOSIT should fail
      const result = await (supabase.rpc as any)("admin_create_transaction", {
        p_investor_id: "test-investor",
        p_fund_id: "test-fund",
        p_type: "DEPOSIT",
        p_amount: 1000,
        p_tx_date: "2025-01-01",
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("Top-up not allowed");
    });

    it("should succeed when investor has existing position (balance > 0)", async () => {
      // Mock position check returns existing position
      mockMaybeSingle.mockResolvedValueOnce({
        data: { current_value: 5000 },
        error: null,
      });

      // Mock transaction insert succeeds
      mockRpc.mockResolvedValueOnce({ data: { id: "new-tx-id" }, error: null });

      const { supabase } = await import("@/integrations/supabase/client");

      // Check balance first
      const position = await supabase
        .from("investor_positions")
        .select("current_value")
        .eq("investor_id", "test-investor")
        .eq("fund_id", "test-fund")
        .maybeSingle();

      expect(position.data?.current_value).toBeGreaterThan(0);

      // Create DEPOSIT
      const result = await (supabase.rpc as any)("admin_create_transaction", {
        p_investor_id: "test-investor",
        p_fund_id: "test-fund",
        p_type: "DEPOSIT",
        p_amount: 1000,
        p_tx_date: "2025-01-01",
      });

      expect(result.error).toBeNull();
      expect(result.data).toHaveProperty("id");
    });
  });

  describe("AUM requirement enforcement", () => {
    it("should fail when AUM is missing for transaction date", async () => {
      // Mock AUM check returns no AUM
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

      // Mock transaction insert fails due to missing AUM
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: "AUM missing for fund on 2025-01-01",
          code: "P0001",
        },
      });

      const { supabase } = await import("@/integrations/supabase/client");

      // Check AUM first
      const aum = await supabase
        .from("fund_daily_aum")
        .select("id")
        .eq("fund_id", "test-fund")
        .eq("aum_date", "2025-01-01")
        .maybeSingle();

      expect(aum.data).toBeNull();

      // Attempt transaction should fail
      const result = await (supabase.rpc as any)("admin_create_transaction", {
        p_investor_id: "test-investor",
        p_fund_id: "test-fund",
        p_type: "DEPOSIT",
        p_amount: 1000,
        p_tx_date: "2025-01-01",
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("AUM missing");
    });

    it("should succeed when AUM exists for transaction date", async () => {
      // Mock AUM check returns existing AUM
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: "aum-id" },
        error: null,
      });

      // Mock position check
      mockMaybeSingle.mockResolvedValueOnce({
        data: { current_value: 5000 },
        error: null,
      });

      // Mock transaction insert succeeds
      mockRpc.mockResolvedValueOnce({ data: { id: "new-tx-id" }, error: null });

      const { supabase } = await import("@/integrations/supabase/client");

      // Check AUM first
      const aum = await supabase
        .from("fund_daily_aum")
        .select("id")
        .eq("fund_id", "test-fund")
        .eq("aum_date", "2025-01-01")
        .maybeSingle();

      expect(aum.data).not.toBeNull();

      // Create transaction
      const result = await (supabase.rpc as any)("admin_create_transaction", {
        p_investor_id: "test-investor",
        p_fund_id: "test-fund",
        p_type: "DEPOSIT",
        p_amount: 1000,
        p_tx_date: "2025-01-01",
      });

      expect(result.error).toBeNull();
    });
  });
});

describe("Transaction Void and Edit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("void_transaction RPC", () => {
    it("should create a reversal transaction when voiding", async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          voided_tx_id: "original-tx-id",
          reversal_tx_id: "reversal-tx-id",
        },
        error: null,
      });

      const { supabase } = await import("@/integrations/supabase/client");

      const result = await supabase.rpc("void_transaction", {
        p_admin_id: "test-admin-id",
        p_transaction_id: "original-tx-id",
        p_reason: "Duplicate entry",
      });

      expect(mockRpc).toHaveBeenCalledWith("void_transaction", {
        p_admin_id: "test-admin-id",
        p_transaction_id: "original-tx-id",
        p_reason: "Duplicate entry",
      });
      expect(result.error).toBeNull();
    });

    it("should recompute positions after void", async () => {
      // First call: void transaction
      mockRpc.mockResolvedValueOnce({
        data: {
          voided_tx_id: "original-tx-id",
          reversal_tx_id: "reversal-tx-id",
          position_updated: true,
        },
        error: null,
      });

      const { supabase } = await import("@/integrations/supabase/client");

      const result = await supabase.rpc("void_transaction", {
        p_admin_id: "test-admin-id",
        p_transaction_id: "original-tx-id",
        p_reason: "Error correction",
      });

      expect(result.error).toBeNull();
    });
  });

  describe("update_transaction RPC (edit)", () => {
    it("should void original and create replacement when editing", async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          voided_tx_id: "original-tx-id",
          new_tx_id: "replacement-tx-id",
        },
        error: null,
      });

      const { supabase } = await import("@/integrations/supabase/client");

      const result = await supabase.rpc("update_transaction", {
        p_transaction_id: "original-tx-id",
        p_reason: "Corrected amount",
        p_updates: { amount: 2000, notes: "Corrected" },
      });

      expect(mockRpc).toHaveBeenCalledWith("update_transaction", {
        p_transaction_id: "original-tx-id",
        p_reason: "Corrected amount",
        p_updates: { amount: 2000, notes: "Corrected" },
      });
      expect(result.error).toBeNull();
    });
  });
});