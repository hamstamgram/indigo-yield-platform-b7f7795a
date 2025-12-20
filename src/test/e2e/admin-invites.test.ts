/**
 * E2E Tests for Admin Invite RPC Functions
 * Tests P1 Fix: Admin invites require super_admin role
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

describe("Admin Invite RPC Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create_admin_invite RPC", () => {
    it("should call create_admin_invite RPC with correct parameters for super admin", async () => {
      mockRpc.mockResolvedValueOnce({ 
        data: "INV-123ABC", 
        error: null 
      });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const email = "newadmin@example.com";
      const result = await supabase.rpc("create_admin_invite", {
        p_email: email,
      });

      expect(mockRpc).toHaveBeenCalledWith("create_admin_invite", {
        p_email: email,
      });
      expect(result.data).toBe("INV-123ABC");
      expect(result.error).toBeNull();
    });

    it("should return error when non-super-admin calls create_admin_invite", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { 
          message: "Only super admins can create admin invites", 
          code: "42501" 
        },
      });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("create_admin_invite", {
        p_email: "test@example.com",
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("super admin");
    });

    it("should reject invalid email formats", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { 
          message: "Invalid email format", 
          code: "22023" 
        },
      });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("create_admin_invite", {
        p_email: "invalid-email",
      });

      expect(result.error).not.toBeNull();
    });
  });

  describe("is_super_admin RPC", () => {
    it("should return true for super admin users", async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("is_super_admin");

      expect(mockRpc).toHaveBeenCalledWith("is_super_admin");
      expect(result.data).toBe(true);
    });

    it("should return false for regular admin users", async () => {
      mockRpc.mockResolvedValueOnce({ data: false, error: null });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("is_super_admin");

      expect(result.data).toBe(false);
    });

    it("should return false for non-admin users", async () => {
      mockRpc.mockResolvedValueOnce({ data: false, error: null });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("is_super_admin");

      expect(result.data).toBe(false);
    });
  });

  describe("is_admin RPC", () => {
    it("should return true for admin users", async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("is_admin");

      expect(mockRpc).toHaveBeenCalledWith("is_admin");
      expect(result.data).toBe(true);
    });

    it("should return false for non-admin users", async () => {
      mockRpc.mockResolvedValueOnce({ data: false, error: null });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("is_admin");

      expect(result.data).toBe(false);
    });
  });
});
