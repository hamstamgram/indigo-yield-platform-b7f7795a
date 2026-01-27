import { supabase } from "@/integrations/supabase/client";
import { callRPCNoArgs } from "@/lib/supabase/typedRPC";
import { db } from "@/lib/db";
import { generateUUID } from "@/lib/utils";

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
      if ((error as any).code === "42883") return false; // Function not found
      throw error;
    }
    return !!data;
  }

  /**
   * Fetch all admin invites
   */
  async getAll(): Promise<AdminInvite[]> {
    const { data, error } = await supabase
      .from("admin_invites")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as AdminInvite[];
  }

  /**
   * Create a new admin invite
   */
  async create(email: string, role: string): Promise<{ email: string; inviteCode: string }> {
    const inviteCode = generateUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await db.insert("admin_invites", {
      email: email.toLowerCase().trim(),
      invite_code: inviteCode,
      expires_at: expiresAt.toISOString(),
      created_by: user?.id,
      intended_role: role,
    } as any);

    if (error) throw new Error(error.userMessage || error.message);
    return { email, inviteCode };
  }

  /**
   * Delete/revoke an admin invite
   */
  async revoke(inviteId: string): Promise<void> {
    const { error } = await supabase.from("admin_invites").delete().eq("id", inviteId);

    if (error) throw error;
  }

  /**
   * Generate invite link
   */
  generateInviteLink(inviteCode: string): string {
    return `${window.location.origin}/admin-invite?code=${inviteCode}`;
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
