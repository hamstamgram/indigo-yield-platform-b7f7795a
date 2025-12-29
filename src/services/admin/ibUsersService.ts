/**
 * IB (Introducing Broker) Users Service
 * Handles fetching IB users for the investor wizard
 */

import { supabase } from "@/integrations/supabase/client";

export interface IBUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

/**
 * Fetch all users with IB role
 */
export async function fetchIBUsers(): Promise<IBUser[]> {
  // Get users with IB role
  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "ib");

  if (roleError) throw roleError;

  if (!roleData || roleData.length === 0) {
    return [];
  }

  const userIds = roleData.map((r) => r.user_id);
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .in("id", userIds);

  if (profileError) throw profileError;
  return profiles || [];
}

export const ibUsersService = {
  fetchIBUsers,
};
