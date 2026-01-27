/**
 * Investor Portal Service
 *
 * Handles all Supabase operations for investor-facing portal pages.
 */

import { supabase } from "@/integrations/supabase/client";
import { buildSafeOrFilter } from "@/utils/searchSanitizer";

// ============= Types =============

export interface Session {
  id: string;
  device_label: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
}

export interface AccessLog {
  id: string;
  event: string;
  created_at: string;
  success: boolean;
}

export interface UserSettings {
  theme: string;
  language: string;
  reduceAnimations: boolean;
  hidePortfolioValues: boolean;
  dashboardTimeframe: string;
}

export interface InvestorProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  totp_enabled: boolean;
  totp_verified: boolean;
  avatar_url: string | null;
}

export interface MonthlyStatement {
  id: string;
  period_year: number;
  period_month: number;
  asset_code: string;
  begin_balance: string;
  additions: string;
  redemptions: string;
  net_income: string;
  end_balance: string;
  rate_of_return_mtd: string;
  report_month: string;
}

// ============= Transaction Functions =============

export async function getInvestorTransactionAssets(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("transactions_v2")
    .select("asset")
    .eq("investor_id", userId)
    .eq("visibility_scope", "investor_visible")
    .eq("is_voided", false);

  const uniqueAssets = new Set<string>();
  data?.forEach((d) => {
    if (d.asset) uniqueAssets.add(d.asset);
  });
  return Array.from(uniqueAssets).sort();
}

export async function getInvestorTransactionsList(
  userId: string,
  searchTerm?: string,
  assetFilter?: string,
  typeFilter?: string
) {
  let query = supabase
    .from("transactions_v2")
    .select("*")
    .eq("investor_id", userId)
    .eq("visibility_scope", "investor_visible")
    .eq("is_voided", false);

  if (searchTerm) {
    const safeFilter = buildSafeOrFilter(searchTerm, ["asset", "notes"]);
    if (safeFilter) {
      query = query.or(safeFilter);
    }
  }

  if (assetFilter && assetFilter !== "all") {
    query = query.eq("asset", assetFilter);
  }

  if (typeFilter && typeFilter !== "all") {
    query = query.eq("type", typeFilter as any);
  }

  const { data, error } = await query
    .order("tx_date", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw error;
  return data;
}

// ============= Statement Functions =============

export async function getInvestorStatements(
  userId: string,
  year: number,
  assetFilter?: string
): Promise<MonthlyStatement[]> {
  let query = supabase
    .from("investor_fund_performance")
    .select(
      `
      id,
      fund_name,
      mtd_beginning_balance,
      mtd_additions,
      mtd_redemptions,
      mtd_net_income,
      mtd_ending_balance,
      mtd_rate_of_return,
      purpose,
      period:statement_periods!inner(
        year,
        month,
        period_end_date
      )
    `
    )
    .eq("investor_id", userId)
    .eq("period.year", year)
    .eq("purpose", "reporting")
    .order("period(period_end_date)", { ascending: false });

  if (assetFilter && assetFilter !== "all") {
    query = query.eq("fund_name", assetFilter);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((record: any) => ({
    id: record.id,
    period_year: record.period.year,
    period_month: record.period.month,
    asset_code: record.fund_name,
    begin_balance: record.mtd_beginning_balance?.toString() || "0",
    additions: record.mtd_additions?.toString() || "0",
    redemptions: record.mtd_redemptions?.toString() || "0",
    net_income: record.mtd_net_income?.toString() || "0",
    end_balance: record.mtd_ending_balance?.toString() || "0",
    rate_of_return_mtd: record.mtd_rate_of_return?.toString() || "0",
    report_month: record.period.period_end_date,
  }));
}

export async function getStatementYears(userId: string): Promise<number[]> {
  const { data } = await supabase
    .from("investor_fund_performance")
    .select("period:statement_periods(year)")
    .eq("investor_id", userId);

  const years = new Set<number>();
  data?.forEach((d: any) => {
    if (d.period?.year) years.add(d.period.year);
  });

  const sorted = Array.from(years).sort((a, b) => b - a);
  return sorted.length > 0 ? sorted : [new Date().getFullYear()];
}

export async function getStatementAssets(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("investor_fund_performance")
    .select("fund_name")
    .eq("investor_id", userId);

  const assets = new Set<string>();
  data?.forEach((d: any) => {
    if (d.fund_name) assets.add(d.fund_name);
  });

  return Array.from(assets).sort();
}

export async function getStatementHtmlContent(
  userId: string,
  periodYear: number,
  periodMonth: number
): Promise<string> {
  // Get period id first
  const { data: periodData } = await supabase
    .from("statement_periods")
    .select("id")
    .eq("year", periodYear)
    .eq("month", periodMonth)
    .maybeSingle();

  if (!periodData) {
    throw new Error("Statement period not found");
  }

  // Fetch the generated statement HTML
  const { data: generatedStatement, error: fetchError } = await supabase
    .from("generated_statements")
    .select("html_content")
    .eq("period_id", periodData.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError || !generatedStatement?.html_content) {
    throw new Error("Statement not yet generated. Please contact support.");
  }

  return generatedStatement.html_content;
}

// ============= Profile/Settings Functions =============

export async function getInvestorProfile(userId: string): Promise<InvestorProfile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Create minimal profile from auth
  const minimalProfile: InvestorProfile = {
    id: user.id,
    email: user.email || "",
    first_name: null,
    last_name: null,
    phone: null,
    totp_enabled: false,
    totp_verified: false,
    avatar_url: null,
  };

  // Try to fetch full profile
  const { data: profileData, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching profile:", error);
    return minimalProfile;
  }

  if (profileData) {
    return {
      id: profileData.id,
      email: profileData.email,
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      phone: profileData.phone,
      totp_enabled: profileData.totp_enabled || false,
      totp_verified: profileData.totp_verified || false,
      avatar_url: profileData.avatar_url,
    };
  }

  return minimalProfile;
}

export async function getUserPreferences(userId: string): Promise<Partial<UserSettings> | null> {
  const { data } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", userId)
    .maybeSingle();

  return data?.preferences as Partial<UserSettings> | null;
}

export async function saveUserPreferences(userId: string, settings: UserSettings): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ preferences: settings as any })
    .eq("id", userId);

  if (error) throw error;
}

// ============= Session Management Functions =============

export async function getActiveSessions(userId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from("user_sessions")
    .select("id, device_label, user_agent, created_at, last_seen_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAccessLogs(userId: string, limit = 20): Promise<AccessLog[]> {
  const { data, error } = await supabase
    .from("access_logs")
    .select("id, event, created_at, success")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function revokeSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from("user_sessions").delete().eq("id", sessionId);

  if (error) throw error;
}
