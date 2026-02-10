import { supabase } from "@/integrations/supabase/client";
import { callRPCNoArgs } from "@/lib/supabase/typedRPC";

export interface AdminInvite {
  id: string;
  email: string;
  invite_code: string;
  intended_role?: string | null;
  created_at: string;
  expires_at: string;
  used: boolean | null;
  created_by: string | null;
}

class AdminInviteService {
  /**
   * Check if current user is super admin
   */
  async isSuperAdmin(): Promise<boolean> {
    const { data, error } = await callRPCNoArgs("is_super_admin");
    if (error) {
      if ((error as { code?: string }).code === "42883") return false; // Function not found
      throw error;
    }
    return !!data;
  }

  /**
   * Fetch all admin invites
   * NOTE: admin_invites table was dropped - returns empty
   */
  async getAll(): Promise<AdminInvite[]> {
    return [];
  }

  /**
   * Create a new admin invite
   * NOTE: admin_invites table was dropped
   */
  async create(_email: string, _role: string): Promise<{ email: string; inviteCode: string }> {
    throw new Error("Admin invites feature has been removed");
  }

  /**
   * Delete/revoke an admin invite
   * NOTE: admin_invites table was dropped
   */
  async revoke(_inviteId: string): Promise<void> {
    throw new Error("Admin invites feature has been removed");
  }

  /**
   * Generate invite link
   */
  generateInviteLink(inviteCode: string): string {
    return `${window.location.origin}/admin-invite?code=${inviteCode}`;
  }

  /**
   * Get the current auth session (used by invite callback page)
   */
  async getSession() {
    return supabase.auth.getSession();
  }

  /**
   * Send invite email via edge function
   */
  async sendInviteEmail(invite: AdminInvite): Promise<void> {
    const { error } = await supabase.functions.invoke("send-admin-invite", {
      body: { invite },
    });

    if (error) throw error;
  }
}

export const adminInviteService = new AdminInviteService();
