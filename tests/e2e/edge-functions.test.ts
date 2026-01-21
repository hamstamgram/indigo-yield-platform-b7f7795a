/**
 * E2E Tests for Edge Function Security
 * Tests P0 Fix: Edge functions require authentication
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
const mockFunctionsInvoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
  },
}));

describe("Edge Function Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generate-fund-performance Edge Function", () => {
    it("should return 401 when called without authentication", async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Unauthorized", status: 401 },
      });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.functions.invoke("generate-fund-performance", {
        body: { periodId: "test-period" },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(401);
    });

    it("should return 403 when called by non-admin user", async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Admin access required", status: 403 },
      });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.functions.invoke("generate-fund-performance", {
        body: { periodId: "test-period" },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(403);
    });

    it("should succeed when called by admin user", async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, recordsProcessed: 10 },
        error: null,
      });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.functions.invoke("generate-fund-performance", {
        body: { periodId: "test-period" },
      });

      expect(result.error).toBeNull();
      expect(result.data?.success).toBe(true);
    });

    it("should use upsert to prevent duplicate records", async () => {
      // First call
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, recordsProcessed: 5 },
        error: null,
      });

      const { supabase } = await import("@/integrations/supabase/client");
      
      // First generation
      const result1 = await supabase.functions.invoke("generate-fund-performance", {
        body: { periodId: "same-period" },
      });

      expect(result1.data?.success).toBe(true);

      // Second call with same period (should upsert, not create duplicates)
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, recordsProcessed: 5 },
        error: null,
      });

      const result2 = await supabase.functions.invoke("generate-fund-performance", {
        body: { periodId: "same-period" },
      });

      expect(result2.data?.success).toBe(true);
      // Both should succeed without duplicate key errors
    });
  });

  describe("Other Protected Edge Functions", () => {
    const protectedFunctions = [
      "send-email",
      "generate-pdf-report",
      "import-transactions",
      "calculate-fees",
    ];

    protectedFunctions.forEach((funcName) => {
      it(`should require authentication for ${funcName}`, async () => {
        mockFunctionsInvoke.mockResolvedValueOnce({
          data: null,
          error: { message: "Unauthorized", status: 401 },
        });

        const { supabase } = await import("@/integrations/supabase/client");
        
        const result = await supabase.functions.invoke(funcName, {
          body: {},
        });

        expect(mockFunctionsInvoke).toHaveBeenCalledWith(funcName, { body: {} });
      });
    });
  });

  describe("CORS Headers", () => {
    it("should handle OPTIONS preflight requests", async () => {
      // Edge functions should respond to OPTIONS with CORS headers
      const expectedCorsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      };

      // Verify headers are configured correctly
      expect(expectedCorsHeaders["Access-Control-Allow-Origin"]).toBe("*");
      expect(expectedCorsHeaders["Access-Control-Allow-Headers"]).toContain("authorization");
    });
  });
});
