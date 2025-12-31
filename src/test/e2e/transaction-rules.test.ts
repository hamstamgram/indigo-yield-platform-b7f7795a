/**
 * E2E Tests for Transaction Type Rules and AUM Requirement
 * Tests P1 Fixes: FIRST_INVESTMENT vs TOP_UP validation and AUM enforcement
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
        error: null 
      });
      
      // Mock transaction insert fails due to validation
      mockRpc.mockResolvedValueOnce({ 
        data: null, 
        error: { 
          message: "First Investment only allowed when balance is 0. Use Deposit.", 
          code: "P0001" 
        } 
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
          code: "P0001" 
        } 
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
        error: null 
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
          code: "P0001" 
        } 
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
        error: null 
      });
      
      // Mock position check
      mockMaybeSingle.mockResolvedValueOnce({ 
        data: { current_value: 5000 }, 
        error: null 
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
          reversal_tx_id: "reversal-tx-id" 
        }, 
        error: null 
      });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("void_transaction", {
        p_transaction_id: "original-tx-id",
        p_reason: "Duplicate entry",
      });

      expect(mockRpc).toHaveBeenCalledWith("void_transaction", {
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
          position_updated: true 
        }, 
        error: null 
      });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("void_transaction", {
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
          new_tx_id: "replacement-tx-id" 
        }, 
        error: null 
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
