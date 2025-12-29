/**
 * Admin Users Service
 * Handles fetching and managing admin user accounts
 */

import { supabase } from "@/integrations/supabase/client";

export interface AdminUserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface AdminInviteParams {
  email: string;
  createdBy: string;
}

/**
 * Fetch all user profiles for admin management
 */
export async function fetchAllUsers(): Promise<AdminUserProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, is_admin, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Toggle admin status for a user
 */
export async function toggleAdminStatus(userId: string, currentStatus: boolean): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_admin: !currentStatus })
    .eq("id", userId);

  if (error) throw error;
}

/**
 * Send an admin invitation
 */
export async function sendAdminInvite(params: AdminInviteParams): Promise<void> {
  const { email, createdBy } = params;

  // Generate invite code (random string)
  const inviteCode = [...Array(24)]
    .map(() => Math.floor(Math.random() * 36).toString(36))
    .join("");

  // Set expiration date (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Insert the invite into the database
  const { data: invite, error: inviteError } = await supabase
    .from("admin_invites")
    .insert([
      {
        email,
        invite_code: inviteCode,
        expires_at: expiresAt.toISOString(),
        created_by: createdBy,
      },
    ])
    .select("*")
    .single();

  if (inviteError) throw inviteError;

  // Send the invitation email
  const { error: emailError } = await supabase.functions.invoke("send-admin-invite", {
    body: { invite },
  });

  if (emailError) throw emailError;
}

/**
 * Check if user is a super admin
 */
export async function checkSuperAdminRole(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();

  if (error) {
    console.error("Error checking super admin role:", error);
    return false;
  }

  return !!data;
}

export const adminUsersService = {
  fetchAllUsers,
  toggleAdminStatus,
  sendAdminInvite,
  checkSuperAdminRole,
};
