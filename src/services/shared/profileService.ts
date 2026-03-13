/**
 * Profile Service
 * Handles profile queries and operations
 */

import { supabase } from "@/integrations/supabase/client";
import { batchProcess, batchMapProcess } from "@/utils/batchHelper";

export interface ProfileSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
}

export interface TransactionInvestor {
  id: string;
  email: string;
  displayName: string;
  isSystemAccount: boolean;
}

interface RawProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at?: string;
}

async function getById(profileId: string): Promise<ProfileSummary | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.email,
  };
}

async function getProfileById(profileId: string): Promise<RawProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, created_at")
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getAllProfiles(): Promise<RawProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .order("last_name")
    .limit(2000);

  if (error) throw error;
  return data || [];
}

async function getProfilesWithAdmin(): Promise<
  Array<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    is_admin: boolean;
    created_at: string;
  }>
> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, is_admin, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getFullProfile(profileId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getCurrentProfileRaw() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function toggleAdminStatus(userId: string, currentStatus: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_admin: !currentStatus })
    .eq("id", userId);

  if (error) throw error;
  return !currentStatus;
}

async function updateProfile(userId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getInvestorProfileWithFund(investorId: string) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("id", investorId)
    .single();

  if (profileError) throw profileError;

  const { data: positions } = await supabase
    .from("investor_positions")
    .select("fund_id")
    .eq("investor_id", investorId)
    .limit(1);

  const { data: funds } = await supabase.from("funds").select("id").eq("status", "active").limit(1);

  const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email;

  return {
    id: profile.id,
    name,
    email: profile.email,
    fund_id: positions?.[0]?.fund_id || funds?.[0]?.id || "",
  };
}

async function getActiveInvestors(
  limit = 100,
  offset = 0
): Promise<{ data: ProfileSummary[]; total: number }> {
  const { data, error, count } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name", { count: "exact" })
    .eq("status", "active")
    .order("last_name")
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const profiles = (data || []).map((p: any) => ({
    id: p.id,
    email: p.email,
    firstName: p.first_name,
    lastName: p.last_name,
    name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
  }));

  return {
    data: profiles,
    total: count || 0,
  };
}

/**
 * Fetch all reporting-eligible investors AND IB accounts for a given statement period.
 * Uses get_reporting_eligible_investors RPC, which correctly includes both account types
 * (fixed by migration 20260223152200_fix_ib_reporting_and_zero_balances.sql).
 * Returns only eligible accounts (has positions + performance data, not already generated).
 */
async function getReportingEligibleInvestors(periodId: string): Promise<ProfileSummary[]> {
  const { data, error } = await supabase.rpc("get_reporting_eligible_investors", {
    p_period_id: periodId,
  });

  if (error) throw error;

  const rows = (data as any[]) || [];
  return rows
    .filter((r: any) => r.is_eligible === true)
    .map((r: any) => ({
      id: r.investor_id,
      email: r.email,
      firstName: null,
      lastName: null,
      name: r.investor_name || r.email,
    }));
}

async function getMyProfile(): Promise<ProfileSummary | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return getById(user.id);
}

async function countDocuments(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count || 0;
}

async function getMonthlyReports(investorId: string, reportMonth: string): Promise<any[]> {
  // reportMonth format: "YYYY-MM-01"
  const [yearStr, monthStr] = reportMonth.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  // Find the statement_period for this month
  const { data: period } = await supabase
    .from("statement_periods")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (!period) return [];

  // Get fund asset mapping
  const { data: fundsData } = await supabase.from("funds").select("name, asset");
  const fundAssetMap = new Map<string, string>();
  fundsData?.forEach((f) => fundAssetMap.set(f.name, f.asset));

  // Get performance data from investor_fund_performance
  const { data, error } = await supabase
    .from("investor_fund_performance")
    .select("*")
    .eq("investor_id", investorId)
    .eq("period_id", period.id)
    .eq("purpose", "reporting");

  if (error) throw error;

  return (data || []).map((record: any) => ({
    asset_code: fundAssetMap.get(record.fund_name) || record.fund_name,
    opening_balance: Number(record.mtd_beginning_balance || 0),
    additions: Number(record.mtd_additions || 0),
    withdrawals: Number(record.mtd_redemptions || 0),
    yield_earned: Number(record.mtd_net_income || 0),
    closing_balance: Number(record.mtd_ending_balance || 0),
  }));
}

async function getInvestorFundPerformance(investorId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("investor_fund_performance")
    .select("*")
    .eq("investor_id", investorId)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) throw error;
  return data || [];
}

async function getInvestorFundPerformanceByPeriod(
  investorId: string,
  periodId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from("investor_fund_performance")
    .select("*")
    .eq("investor_id", investorId)
    .eq("period_id", periodId)
    .limit(100);

  if (error) throw error;
  return data || [];
}

async function updateFeePercentage(investorId: string, feePercentage: number): Promise<void> {
  // profiles.fee_pct was dropped; write to investor_fee_schedule instead
  // First Principles: ALWAYS clear end_date to prevent silent expiration
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("investor_fee_schedule").upsert(
    {
      investor_id: investorId,
      fee_pct: feePercentage,
      effective_date: today,
      end_date: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "investor_id,effective_date" }
  );

  if (error) throw error;
}

async function getUsersForDeposits(): Promise<
  Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  }>
> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, is_system_account")
    .eq("is_system_account", false)
    .order("first_name")
    .limit(100);

  if (error) throw error;
  return data || [];
}

async function getInvestorsForTransaction(): Promise<TransactionInvestor[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, account_type, is_system_account")
    .order("last_name")
    .limit(200);

  if (error) throw error;

  return (data || []).map((p) => ({
    id: p.id,
    email: p.email,
    displayName: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
    isSystemAccount: p.is_system_account === true || p.account_type === "fees_account",
  }));
}

async function updateProfileSecure(params: {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  status?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("update_user_profile_secure", {
    p_user_id: params.userId,
    p_first_name: params.firstName ?? null,
    p_last_name: params.lastName ?? null,
    p_phone: params.phone ?? null,
    p_status: params.status ?? null,
  });

  if (error) throw error;
}

async function getLastActivityBatch(investorIds: string[]): Promise<Map<string, string>> {
  if (investorIds.length === 0) return new Map();

  return batchMapProcess(investorIds, 50, async (batchIds) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, last_activity_at")
      .in("id", batchIds);

    if (error) throw error;

    const result = new Map<string, string>();
    (data || []).forEach((p) => {
      if (p.id && p.last_activity_at) {
        result.set(p.id, p.last_activity_at);
      }
    });
    return result;
  });
}

async function getIBParentsBatch(investorIds: string[]): Promise<Map<string, string>> {
  if (investorIds.length === 0) return new Map();

  const investorsWithIB = await batchProcess(investorIds, 50, async (batchIds) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, ib_parent_id")
      .in("id", batchIds)
      .not("ib_parent_id", "is", null);

    if (error) throw error;
    return data;
  });

  const ibParentIds = [
    ...new Set(
      investorsWithIB.map((p) => p.ib_parent_id).filter((id): id is string => Boolean(id))
    ),
  ];

  if (ibParentIds.length === 0) return new Map();

  const parents = await batchProcess(ibParentIds, 50, async (batchIds) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", batchIds);

    if (error) throw error;
    return data;
  });

  const ibParentNames = new Map<string, string>();
  parents.forEach((p) => {
    if (p.id) {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
      ibParentNames.set(p.id, name);
    }
  });

  const result = new Map<string, string>();
  investorsWithIB.forEach((p) => {
    if (p.id && p.ib_parent_id && ibParentNames.has(p.ib_parent_id)) {
      result.set(p.id, ibParentNames.get(p.ib_parent_id)!);
    }
  });

  return result;
}

export const profileService = {
  getById,
  getProfileById,
  getAllProfiles,
  getProfilesWithAdmin,
  getFullProfile,
  getCurrentProfileRaw,
  toggleAdminStatus,
  updateProfile,
  getInvestorProfileWithFund,
  getActiveInvestors,
  getReportingEligibleInvestors,
  getMyProfile,
  countDocuments,
  getMonthlyReports,
  getInvestorFundPerformance,
  getInvestorFundPerformanceByPeriod,
  updateFeePercentage,
  getUsersForDeposits,
  getInvestorsForTransaction,
  updateProfileSecure,
  getLastActivityBatch,
  getIBParentsBatch,
};
