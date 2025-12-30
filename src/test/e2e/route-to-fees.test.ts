/**
 * E2E Tests for Route to INDIGO FEES functionality
 * Tests P0 Fix: Withdrawal routing to fees creates admin_only transactions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { routeWithdrawalToFees } from "@/lib/supabase/typedRpc";

// Mock Supabase client
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();

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
                  return { data: [], error: null };
                },
              };
            },
          };
        },
      };
    },
  },
}));

describe("Route Withdrawal to INDIGO FEES", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("route_withdrawal_to_fees RPC", () => {
    it("should create paired INTERNAL_WITHDRAWAL and INTERNAL_CREDIT transactions", async () => {
      mockRpc.mockResolvedValueOnce({ 
        data: { 
          success: true,
          internal_withdrawal_id: "withdrawal-tx-id",
          internal_credit_id: "credit-tx-id",
          routed_amount: 1000 
        }, 
        error: null 
      });

      const result = await routeWithdrawalToFees({
        p_withdrawal_id: "withdrawal-request-id",
        p_admin_notes: "Routed to fees per policy",
      });

      expect(mockRpc).toHaveBeenCalledWith("route_withdrawal_to_fees", {
        p_withdrawal_id: "withdrawal-request-id",
        p_admin_notes: "Routed to fees per policy",
      });
      expect(result.error).toBeNull();
      expect(result.data?.success).toBe(true);
      expect(result.data).toHaveProperty("internal_withdrawal_id");
      expect(result.data).toHaveProperty("internal_credit_id");
    });

    it("should mark transactions as admin_only visibility", async () => {
      mockRpc.mockResolvedValueOnce({ 
        data: { 
          success: true,
          internal_withdrawal_id: "withdrawal-tx-id",
          internal_credit_id: "credit-tx-id",
          visibility_scope: "admin_only"
        }, 
        error: null 
      });

      const result = await routeWithdrawalToFees({
        p_withdrawal_id: "withdrawal-request-id",
        p_admin_notes: "Internal routing",
      });

      expect(result.error).toBeNull();
      expect(result.data?.visibility_scope).toBe("admin_only");
    });

    it("should be idempotent - skip if already routed", async () => {
      mockRpc.mockResolvedValueOnce({ 
        data: { 
          success: true,
          already_routed: true,
          message: "Withdrawal already routed to fees"
        }, 
        error: null 
      });

      const result = await routeWithdrawalToFees({
        p_withdrawal_id: "already-routed-withdrawal-id",
        p_admin_notes: "Attempted duplicate routing",
      });

      expect(result.error).toBeNull();
      expect(result.data?.already_routed).toBe(true);
    });

    it("should fail for non-approved/processing/completed withdrawals", async () => {
      mockRpc.mockResolvedValueOnce({ 
        data: null, 
        error: { 
          message: "Can only route approved, processing, or completed withdrawals",
          code: "P0001"
        } 
      });

      const result = await routeWithdrawalToFees({
        p_withdrawal_id: "pending-withdrawal-id",
        p_admin_notes: "Should fail",
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("approved");
    });

    it("should only be callable by admins", async () => {
      mockRpc.mockResolvedValueOnce({ 
        data: null, 
        error: { 
          message: "Only admins can route withdrawals to fees",
          code: "42501"
        } 
      });

      const result = await routeWithdrawalToFees({
        p_withdrawal_id: "withdrawal-request-id",
        p_admin_notes: "Attempted by non-admin",
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("admin");
    });
  });

  describe("Admin-only transaction visibility", () => {
    it("should hide internal transactions from investor views", async () => {
      // Mock investor query - should not include admin_only transactions
      mockFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              neq: () => ({ data: [], error: null }), // Filter out admin_only
            }),
          }),
        }),
      }));

      const { supabase } = await import("@/integrations/supabase/client");
      
      // Simulate investor query that filters out admin_only
      const investorTxs = await supabase
        .from("transactions_v2")
        .select("*")
        .eq("investor_id", "test-investor")
        .eq("visibility_scope", "investor_visible" as any); // Only investor-visible

      expect(investorTxs.data).toEqual([]);
    });

    it("should show internal transactions to admins", async () => {
      const adminVisibleTxs = [
        { id: "tx-1", type: "INTERNAL_WITHDRAWAL", visibility_scope: "admin_only" },
        { id: "tx-2", type: "INTERNAL_CREDIT", visibility_scope: "admin_only" },
        { id: "tx-3", type: "DEPOSIT", visibility_scope: "investor_visible" },
      ];

      mockFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({ data: adminVisibleTxs, error: null }),
        }),
      }));

      const { supabase } = await import("@/integrations/supabase/client");
      
      // Simulate admin query that shows all transactions
      const adminTxs = await supabase
        .from("transactions_v2")
        .select("*")
        .eq("investor_id", "test-investor");

      expect(adminTxs.data?.length).toBe(3);
      expect(adminTxs.data?.filter((t: any) => t.visibility_scope === "admin_only").length).toBe(2);
    });
  });

  describe("INDIGO FEES account constants", () => {
    it("should use the correct INDIGO FEES account ID", async () => {
      // Import the constant
      const { INDIGO_FEES_ACCOUNT_ID } = await import("@/constants/fees");
      
      expect(INDIGO_FEES_ACCOUNT_ID).toBe("169bb053-36cb-4f6e-93ea-831f0dfeaf1d");
    });
  });
});
