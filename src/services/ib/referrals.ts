/**
 * IB Referrals Service
 * Handles IB referral queries and available IB parent lookups
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

// ============ Types ============

export interface IBReferral {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  ibPercentage: number;
}

export interface AvailableIBParent {
  id: string;
  email: string;
  name: string;
}

// ============ Functions ============

/**
 * Get all investors that have this investor as their IB parent
 */
export async function getIBReferrals(ibInvestorId: string): Promise<IBReferral[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, ib_percentage")
    .eq("ib_parent_id", ibInvestorId)
    .order("email");

  if (error) {
    logError("ib.getIBReferrals", error, { ibInvestorId });
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    ibPercentage: Number(row.ib_percentage || 0),
  }));
}

/**
 * Get all investors who can be IB parents (must have IB role, excluding the investor themselves)
 */
export async function getAvailableIBParents(investorId: string): Promise<AvailableIBParent[]> {
  // Step 1: Get users with IB role from user_roles table
  const { data: ibRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "ib");

  if (rolesError) {
    logError("ib.getAvailableIBParents.roles", rolesError, { investorId });
    return [];
  }

  if (!ibRoles || ibRoles.length === 0) {
    return [];
  }

  const ibUserIds = ibRoles.map((r) => r.user_id);

  // Step 2: Get profiles for IB users (excluding current investor)
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .in("id", ibUserIds)
    .neq("id", investorId)
    .order("email");

  if (error) {
    logError("ib.getAvailableIBParents.profiles", error, { investorId });
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    email: row.email,
    name: `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email,
  }));
}
