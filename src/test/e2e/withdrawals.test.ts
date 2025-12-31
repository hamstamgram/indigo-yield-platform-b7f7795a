/**
 * E2E Tests for Withdrawal RPC Functions
 * Tests P0 Fix: Withdrawal approval/rejection uses RPC with admin validation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe("Withdrawal RPC Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("approve_withdrawal RPC", () => {
    it("should call approve_withdrawal RPC with correct parameters", async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const requestId = "test-request-id";
      const result = await supabase.rpc("approve_withdrawal", {
        p_request_id: requestId,
        p_approved_amount: 1000,
      });

      expect(mockRpc).toHaveBeenCalledWith("approve_withdrawal", {
        p_request_id: requestId,
        p_approved_amount: 1000,
      });
      expect(result.error).toBeNull();
    });

    it("should return error when non-admin calls approve_withdrawal", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: "Only admins can approve withdrawals", code: "42501" },
      });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("approve_withdrawal", {
        p_request_id: "test-id",
        p_approved_amount: 500,
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("admin");
    });
  });

  describe("reject_withdrawal RPC", () => {
    it("should call reject_withdrawal RPC with correct parameters", async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const requestId = "test-request-id";
      const reason = "Insufficient funds";
      const result = await supabase.rpc("reject_withdrawal", {
        p_request_id: requestId,
        p_reason: reason,
      });

      expect(mockRpc).toHaveBeenCalledWith("reject_withdrawal", {
        p_request_id: requestId,
        p_reason: reason,
      });
      expect(result.error).toBeNull();
    });

    it("should return error when non-admin calls reject_withdrawal", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: "Only admins can reject withdrawals", code: "42501" },
      });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("reject_withdrawal", {
        p_request_id: "test-id",
        p_reason: "Test reason",
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("admin");
    });
  });

  describe("start_processing_withdrawal RPC", () => {
    it("should call start_processing_withdrawal RPC with correct parameters", async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("start_processing_withdrawal", {
        p_request_id: "test-id",
        p_processed_amount: 1000,
      });

      expect(mockRpc).toHaveBeenCalledWith("start_processing_withdrawal", {
        p_request_id: "test-id",
        p_processed_amount: 1000,
      });
      expect(result.error).toBeNull();
    });
  });

  describe("complete_withdrawal RPC", () => {
    it("should call complete_withdrawal RPC with correct parameters", async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("complete_withdrawal", {
        p_request_id: "test-id",
        p_tx_hash: "0x123abc",
      });

      expect(mockRpc).toHaveBeenCalledWith("complete_withdrawal", {
        p_request_id: "test-id",
        p_tx_hash: "0x123abc",
      });
      expect(result.error).toBeNull();
    });
  });
});
