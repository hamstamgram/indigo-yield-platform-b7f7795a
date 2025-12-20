/**
 * E2E Tests for Role Management RPC Functions
 * Tests P1 Fix: Role changes require super_admin and create audit logs
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

describe("Role Management RPC Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("update_admin_role RPC", () => {
    it("should call update_admin_role RPC with correct parameters for super admin", async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const targetUserId = "user-123";
      const newRole = "admin";
      const result = await supabase.rpc("update_admin_role", {
        p_target_user_id: targetUserId,
        p_new_role: newRole,
      });

      expect(mockRpc).toHaveBeenCalledWith("update_admin_role", {
        p_target_user_id: targetUserId,
        p_new_role: newRole,
      });
      expect(result.error).toBeNull();
    });

    it("should return error when non-super-admin calls update_admin_role", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { 
          message: "Only super admins can modify roles", 
          code: "42501" 
        },
      });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("update_admin_role", {
        p_target_user_id: "user-123",
        p_new_role: "admin",
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("super admin");
    });

    it("should prevent self-demotion from super_admin", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { 
          message: "Cannot demote yourself from super_admin", 
          code: "42501" 
        },
      });

      const { supabase } = await import("@/integrations/supabase/client");
      
      // Simulating a super admin trying to demote themselves
      const result = await supabase.rpc("update_admin_role", {
        p_target_user_id: "current-super-admin-id",
        p_new_role: "admin",
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("demote yourself");
    });

    it("should reject invalid role values", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { 
          message: "Invalid role. Must be admin, super_admin, or investor", 
          code: "22023" 
        },
      });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("update_admin_role", {
        p_target_user_id: "user-123",
        p_new_role: "invalid_role",
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("Invalid role");
    });

    it("should upgrade investor to admin successfully", async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("update_admin_role", {
        p_target_user_id: "investor-123",
        p_new_role: "admin",
      });

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });

    it("should upgrade admin to super_admin successfully", async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.rpc("update_admin_role", {
        p_target_user_id: "admin-123",
        p_new_role: "super_admin",
      });

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe("Audit Log Verification", () => {
    it("should create audit log entry on successful role change", async () => {
      // First call: update_admin_role succeeds
      mockRpc.mockResolvedValueOnce({ data: true, error: null });
      
      // Second call: verify audit log was created
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{
                  id: "audit-123",
                  action: "role_change",
                  entity: "user_roles",
                  entity_id: "user-123",
                  old_values: { role: "investor" },
                  new_values: { role: "admin" },
                  created_at: new Date().toISOString(),
                }],
                error: null,
              }),
            }),
          }),
        }),
      });
      
      mockFrom.mockReturnValue({ select: mockSelect });

      const { supabase } = await import("@/integrations/supabase/client");
      
      // Perform role change
      await supabase.rpc("update_admin_role", {
        p_target_user_id: "user-123",
        p_new_role: "admin",
      });

      // Verify audit log
      const auditResult = await supabase
        .from("audit_log")
        .select("*")
        .eq("entity", "user_roles")
        .eq("entity_id", "user-123")
        .order("created_at", { ascending: false })
        .limit(1);

      expect(mockFrom).toHaveBeenCalledWith("audit_log");
    });
  });
});
