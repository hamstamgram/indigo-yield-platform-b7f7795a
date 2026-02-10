/**
 * Admin Users Service
 * Handles fetching and managing admin user accounts
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

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
 * NOTE: admin_invites table was dropped
 */
export async function sendAdminInvite(_params: AdminInviteParams): Promise<void> {
  throw new Error("Admin invites feature has been removed");
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
    logError("adminUsersService.checkSuperAdminRole", error);
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
