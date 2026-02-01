/**
 * Investor Lookup Service
 * CANONICAL SOURCE for all investor fetching operations
 *
 * P1-04: Standardize Investor Lookup Functions
 *
 * Migration guide:
 * - Direct supabase.from("profiles") queries → use getInvestorById()
 * - getAllInvestorsWithSummary() → use getInvestorsForList()
 * - fetchInvestorDetail() → use getInvestorById()
 *
 * This service consolidates investor lookup patterns that were previously
 * scattered across multiple services with duplicate logic.
 */

import { supabase } from "@/integrations/supabase/client";
import type { InvestorProfileStatus } from "@/lib/typeAdapters/investorAdapter";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Full investor profile data for detail views
 */
export interface InvestorLookup {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  status: InvestorProfileStatus;
  accountType: string;
  feePct: number | null;
  phone: string | null;
  ibParentId: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  onboardingDate: string | null;
}

/**
 * Minimal investor reference for dropdowns, selectors, and references
 */
export interface InvestorRef {
  id: string;
  email: string;
  displayName: string;
}

/**
 * Options for filtering investor list queries
 */
export interface InvestorListOptions {
  includeSystemAccounts?: boolean;
  includeAdmins?: boolean;
  status?: InvestorProfileStatus[];
  search?: string;
  limit?: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build display name from profile data
 * Falls back to email prefix for better UX
 */
function buildDisplayName(
  firstName: string | null,
  lastName: string | null,
  email: string
): string {
  const fullName = `${firstName || ""} ${lastName || ""}`.trim();
  if (fullName) return fullName;
  // Use email prefix as fallback
  return email.split("@")[0] || email;
}

/**
 * Transform raw profile row to InvestorLookup
 */
function transformToInvestorLookup(row: {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string | null;
  account_type: string | null;
  fee_pct: number | null;
  phone: string | null;
  ib_parent_id: string | null;
  avatar_url: string | null;
  is_admin: boolean | null;
  created_at: string;
  updated_at: string;
  onboarding_date: string | null;
}): InvestorLookup {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: buildDisplayName(row.first_name, row.last_name, row.email),
    status: (row.status as InvestorProfileStatus) || "pending",
    accountType: row.account_type || "individual",
    feePct: row.fee_pct,
    phone: row.phone,
    ibParentId: row.ib_parent_id,
    avatarUrl: row.avatar_url,
    isAdmin: row.is_admin ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    onboardingDate: row.onboarding_date,
  };
}

/**
 * Transform to minimal InvestorRef
 */
function transformToInvestorRef(row: {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}): InvestorRef {
  return {
    id: row.id,
    email: row.email,
    displayName: buildDisplayName(row.first_name, row.last_name, row.email),
  };
}

// =============================================================================
// CANONICAL LOOKUP FUNCTIONS
// =============================================================================

/**
 * Fetch a single investor by ID with full profile data
 * Use this for investor detail pages, settings views, etc.
 */
export async function getInvestorById(id: string): Promise<InvestorLookup | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      first_name,
      last_name,
      status,
      account_type,
      fee_pct,
      phone,
      ib_parent_id,
      avatar_url,
      is_admin,
      created_at,
      updated_at,
      onboarding_date
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return transformToInvestorLookup(data);
}

/**
 * Fetch list of investors with optional filtering
 * Use this for admin investor lists, reports, etc.
 */
export async function getInvestorsForList(
  options: InvestorListOptions = {}
): Promise<InvestorLookup[]> {
  const {
    includeSystemAccounts = false,
    includeAdmins = false,
    status,
    search,
    limit = 500,
  } = options;

  let query = supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      first_name,
      last_name,
      status,
      account_type,
      fee_pct,
      phone,
      ib_parent_id,
      avatar_url,
      is_admin,
      created_at,
      updated_at,
      onboarding_date
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  // Filter out admins by default
  if (!includeAdmins) {
    query = query.eq("is_admin", false);
  }

  // Filter out system/fees accounts by default
  if (!includeSystemAccounts) {
    query = query.eq("account_type", "investor");
  }

  // Filter by status if provided
  if (status && status.length > 0) {
    query = query.in("status", status);
  }

  // Search by name or email
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(
      `email.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map(transformToInvestorLookup);
}

/**
 * Fetch minimal investor reference for dropdowns/selectors
 * Lighter weight than full profile fetch
 */
export async function getInvestorRef(id: string): Promise<InvestorRef | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return transformToInvestorRef(data);
}

/**
 * Fetch multiple investor references by IDs
 * Optimized for bulk lookups (e.g., transaction lists showing investor names)
 */
export async function getInvestorRefs(ids: string[]): Promise<InvestorRef[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .in("id", ids);

  if (error) {
    throw error;
  }

  return (data || []).map(transformToInvestorRef);
}

/**
 * Check if an investor exists by ID
 * Lightweight existence check
 */
export async function investorExists(id: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("id", id);

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

/**
 * Get active investor count (non-admin, non-system accounts)
 * Use for dashboard metrics
 */
export async function getActiveInvestorCount(): Promise<number> {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_admin", false)
    .eq("account_type", "investor")
    .eq("status", "active");

  if (error) {
    throw error;
  }

  return count ?? 0;
}
