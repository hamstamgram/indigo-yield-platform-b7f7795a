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

/**
 * Check if current user is super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const { data, error } = await callRPCNoArgs("is_super_admin");
  if (error) {
    if ((error as { code?: string }).code === "42883") return false;
    throw error;
  }
  return !!data;
}

/**
 * Fetch all platform invites (Admin/Investor)
 */
export async function getAllInvites(): Promise<AdminInvite[]> {
  const { data, error } = await supabase
    .from("platform_invites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    email: row.email,
    invite_code: row.invite_code,
    created_at: row.created_at,
    expires_at: row.expires_at,
    used: row.status === 'accepted',
    created_by: row.created_by
  }));
}

/**
 * Create a new platform invite
 */
export async function createInvite(
  email: string,
  _role: string
): Promise<{ email: string; inviteCode: string }> {
  // Generate code
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const inviteCode = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("platform_invites").insert({
    email,
    invite_code: inviteCode,
    expires_at: expiresAt.toISOString(),
    created_by: user?.id,
  });

  if (error) throw error;

  return { email, inviteCode };
}

/**
 * Delete/revoke an invite
 */
export async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from("platform_invites")
    .delete()
    .eq("id", inviteId);

  if (error) throw error;
}

/**
 * Generate invite link
 */
export function generateInviteLink(inviteCode: string): string {
  return `${window.location.origin}/investor-invite?code=${inviteCode}`;
}

/**
 * Get the current auth session
 */
export async function getSession() {
  return supabase.auth.getSession();
}

/**
 * Send invite email via edge function
 */
export async function sendInviteEmail(invite: AdminInvite): Promise<void> {
  const { error } = await supabase.functions.invoke("send-notification-email", {
    body: {
      to: invite.email,
      template: "welcome",
      data: {
        name: "Member",
        loginLink: generateInviteLink(invite.invite_code),
      },
    },
  });

  if (error) throw error;
}

// Plain object singleton for adminInviteService.method() pattern
export const adminInviteService = {
  isSuperAdmin,
  getAll: getAllInvites,
  create: createInvite,
  revoke: revokeInvite,
  generateInviteLink,
  getSession,
  sendInviteEmail,
};
