/**
 * IB (Introducing Broker) Service
 * Handles IB allocation calculations and tracking
 */

import { supabase } from "@/integrations/supabase/client";

export interface IBConfig {
  investorId: string;
  ibParentId: string | null;
  ibPercentage: number;
}

export interface IBAllocation {
  id: string;
  periodId: string | null;
  ibInvestorId: string;
  sourceInvestorId: string;
  fundId: string | null;
  sourceNetIncome: number;
  ibPercentage: number;
  ibFeeAmount: number;
  effectiveDate: string;
  createdAt: string;
}

/**
 * Get IB configuration for an investor
 */
export async function getInvestorIBConfig(investorId: string): Promise<IBConfig | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, ib_parent_id, ib_percentage")
    .eq("id", investorId)
    .maybeSingle();

  if (error || !data) {
    console.error("Error fetching IB config:", error);
    return null;
  }

  return {
    investorId: data.id,
    ibParentId: data.ib_parent_id,
    ibPercentage: data.ib_percentage || 0,
  };
}

/**
 * Update IB configuration for an investor
 */
export async function updateInvestorIBConfig(
  investorId: string,
  ibParentId: string | null,
  ibPercentage: number
): Promise<{ success: boolean; error?: string }> {
  // Validate percentage
  if (ibPercentage < 0 || ibPercentage > 100) {
    return { success: false, error: "IB percentage must be between 0 and 100" };
  }

  // Prevent self-referencing
  if (ibParentId === investorId) {
    return { success: false, error: "An investor cannot be their own IB parent" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      ib_parent_id: ibParentId,
      ib_percentage: ibPercentage,
    })
    .eq("id", investorId);

  if (error) {
    console.error("Error updating IB config:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Calculate IB allocation for a given net income
 */
export function calculateIBAllocation(
  netIncome: number,
  ibPercentage: number
): { ibFee: number; adjustedNetIncome: number } {
  if (ibPercentage <= 0 || netIncome <= 0) {
    return { ibFee: 0, adjustedNetIncome: netIncome };
  }

  const ibFee = netIncome * (ibPercentage / 100);
  const adjustedNetIncome = netIncome - ibFee;

  return { ibFee, adjustedNetIncome };
}

/**
 * Record an IB allocation in the database
 */
export async function recordIBAllocation(
  ibInvestorId: string,
  sourceInvestorId: string,
  sourceNetIncome: number,
  ibPercentage: number,
  ibFeeAmount: number,
  effectiveDate: Date,
  fundId?: string,
  periodId?: string,
  createdBy?: string
): Promise<{ success: boolean; allocationId?: string; error?: string }> {
  const { data, error } = await supabase
    .from("ib_allocations")
    .insert({
      ib_investor_id: ibInvestorId,
      source_investor_id: sourceInvestorId,
      source_net_income: sourceNetIncome,
      ib_percentage: ibPercentage,
      ib_fee_amount: ibFeeAmount,
      effective_date: effectiveDate.toISOString().split("T")[0],
      fund_id: fundId || null,
      period_id: periodId || null,
      created_by: createdBy || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error recording IB allocation:", error);
    return { success: false, error: error.message };
  }

  return { success: true, allocationId: data.id };
}

/**
 * Get all IB allocations for an IB (where they receive fees)
 */
export async function getIBAllocationsForIB(
  ibInvestorId: string,
  startDate?: Date,
  endDate?: Date
): Promise<IBAllocation[]> {
  let query = supabase
    .from("ib_allocations")
    .select("*")
    .eq("ib_investor_id", ibInvestorId)
    .order("effective_date", { ascending: false })
    .order("id", { ascending: false });

  if (startDate) {
    query = query.gte("effective_date", startDate.toISOString().split("T")[0]);
  }
  if (endDate) {
    query = query.lte("effective_date", endDate.toISOString().split("T")[0]);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching IB allocations:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    periodId: row.period_id,
    ibInvestorId: row.ib_investor_id,
    sourceInvestorId: row.source_investor_id,
    fundId: row.fund_id,
    sourceNetIncome: Number(row.source_net_income),
    ibPercentage: Number(row.ib_percentage),
    ibFeeAmount: Number(row.ib_fee_amount),
    effectiveDate: row.effective_date,
    createdAt: row.created_at,
  }));
}

/**
 * Get all investors that have this investor as their IB parent
 */
export async function getIBReferrals(ibInvestorId: string): Promise<
  Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    ibPercentage: number;
  }>
> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, ib_percentage")
    .eq("ib_parent_id", ibInvestorId)
    .order("email");

  if (error) {
    console.error("Error fetching IB referrals:", error);
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
 * Get all investors who can be IB parents (excluding the investor themselves and their referrals to prevent cycles)
 */
export async function getAvailableIBParents(investorId: string): Promise<
  Array<{
    id: string;
    email: string;
    name: string;
  }>
> {
  // Get all profiles that are not this investor
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .neq("id", investorId)
    .eq("is_admin", false)
    .order("email");

  if (error) {
    console.error("Error fetching available IB parents:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    email: row.email,
    name: `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email,
  }));
}
