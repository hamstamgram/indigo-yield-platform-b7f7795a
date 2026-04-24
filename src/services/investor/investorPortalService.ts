/**
 * Investor Portal Service
 * Consolidated service for investor portal operations:
 * - Transactions
 * - Statements
 * - Settings
 * - Security logs
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

// =====================================================
// TYPES
// =====================================================

export interface Session {
  id: string;
  ip: string;
  user_agent: string;
  is_current: boolean;
  last_active: string;
}

export interface AccessLog {
  id: string;
  event_type: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  metadata?: any;
}

export interface UserSettings {
  language: string;
  timezone?: string;
  emailNotifications?: boolean;
  marketingEmails?: boolean;
  twoFactorEnabled?: boolean;
  theme: 'light' | 'dark' | 'system';
  currency?: string;
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
  avatar_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  preferences?: any;
  totp_enabled?: boolean;
}

export interface MonthlyStatement {
  id: string;
  month: number;
  year: number;
  period_month: number;
  period_year: number;
  asset_code: string;
  fund_name: string;
  beginning_balance: string;
  begin_balance: string;
  additions: string;
  redemptions: string;
  net_income: string;
  ending_balance: string;
  end_balance: string;
  rate_of_return: string;
  rate_of_return_mtd: string;
  created_at: string;
  // Extended fields for YTD/QTD/ITD
  qtd_beginning_balance?: string;
  qtd_additions?: string;
  qtd_redemptions?: string;
  qtd_net_income?: string;
  qtd_ending_balance?: string;
  qtd_rate_of_return?: string;
  ytd_beginning_balance?: string;
  ytd_additions?: string;
  ytd_redemptions?: string;
  ytd_net_income?: string;
  ytd_ending_balance?: string;
  ytd_rate_of_return?: string;
  itd_beginning_balance?: string;
  itd_additions?: string;
  itd_redemptions?: string;
  itd_net_income?: string;
  itd_ending_balance?: string;
  itd_rate_of_return?: string;
}

// =====================================================
// SERVICE FUNCTIONS
// =====================================================

/**
 * Load investor profile for account settings
 */
export async function getInvestorProfile(userId: string): Promise<InvestorProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    logError("getInvestorProfile", error, { userId });
    throw error;
  }

  return data as unknown as InvestorProfile;
}

/**
 * Load user preferences
 */
export async function getUserPreferences(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", userId)
    .single();

  if (error) {
    logError("getUserPreferences", error, { userId });
  }

  const prefs = (data as any)?.preferences;

  // Return merged with defaults
  return {
    language: prefs?.language || 'en',
    timezone: prefs?.timezone || 'UTC',
    emailNotifications: prefs?.emailNotifications ?? true,
    marketingEmails: prefs?.marketingEmails ?? false,
    twoFactorEnabled: prefs?.twoFactorEnabled ?? false,
    theme: prefs?.theme || 'system',
    currency: prefs?.currency || 'USD',
    reduceAnimations: prefs?.reduceAnimations ?? false,
    hidePortfolioValues: prefs?.hidePortfolioValues ?? false,
    dashboardTimeframe: prefs?.dashboardTimeframe || '30d',
  };
}

/**
 * Save user preferences
 */
export async function saveUserPreferences(userId: string, preferences: Partial<UserSettings>): Promise<void> {
  // Get current preferences first to merge
  const { data: currentData } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", userId)
    .single();

  const currentPrefs = (currentData as any)?.preferences || {};
  const mergedPrefs = { ...currentPrefs, ...preferences };

  const { error } = await supabase
    .from("profiles")
    .update({ preferences: mergedPrefs } as any)
    .eq("id", userId);

  if (error) {
    logError("saveUserPreferences", error, { userId });
    throw error;
  }
}

/**
 * Load active sessions for security panel
 */
export async function getActiveSessions(_userId: string): Promise<Session[]> {
  // TODO: user_sessions table was dropped — re-implement when session management feature is built
  return [];
}

/**
 * Load security access logs
 */
export async function getAccessLogs(userId: string, limit: number = 20): Promise<AccessLog[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, action, created_at, meta")
    .eq("actor_user", userId)
    .in("action", ["login", "logout", "password_change", "2fa_enabled", "2fa_disabled"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logError("getAccessLogs", error, { userId });
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    event_type: row.action,
    ip_address: (row.meta as any)?.ip_address || "Unknown",
    user_agent: (row.meta as any)?.user_agent || "Unknown",
    created_at: row.created_at,
    metadata: row.meta,
  }));
}

/**
 * Get available assets for transaction history filtering
 */
export async function getInvestorTransactionAssets(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("investor_positions_with_funds" as any)
    .select("asset_code")
    .eq("investor_id", userId);

  if (error) {
    logError("getInvestorTransactionAssets", error, { userId });
    return [];
  }

  // Unique list of assets
  const assets = [...new Set((data as any[] || []).map(p => p.asset_code))];
  return assets as string[];
}

export interface InvestorTransactionsPage {
  items: any[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Get list of transactions for investor portal
 */
export async function getInvestorTransactionsList(
  userId: string,
  searchTerm?: string,
  assetFilter?: string,
  typeFilter?: string,
  page: number = 0,
  pageSize: number = 25,
): Promise<InvestorTransactionsPage> {
  let query = supabase
    .from("investor_transactions_view" as any)
    .select("*", { count: "exact" })
    .eq("investor_id", userId)
    .order("transaction_date", { ascending: false });

  if (assetFilter && assetFilter !== "all") {
    query = (query as any).eq("asset_code", assetFilter);
  }

  if (typeFilter && typeFilter !== "all") {
    query = (query as any).eq("transaction_type", typeFilter);
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = (query as any).range(from, to);

  const { data, error, count } = await (query as any);

  if (error) {
    logError("getInvestorTransactionsList", error, { userId, searchTerm, assetFilter, typeFilter });
    throw error;
  }

  return {
    items: (data as any[]) || [],
    totalCount: count || 0,
    page,
    pageSize,
  };
}

/**
 * Get monthly statements for investor portal
 */
export async function getInvestorStatements(
  userId: string,
  year?: number,
  assetCode?: string,
  month?: number
): Promise<MonthlyStatement[]> {
  let query = supabase
    .from("monthly_statements_view" as any)
    .select("*")
    .eq("investor_id", userId)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (assetCode) {
    query = (query as any).eq("asset_code", assetCode);
  }

  if (year) {
    query = (query as any).eq("year", year);
  }

  if (month) {
    query = (query as any).eq("month", month);
  }

  const { data, error } = await (query as any);

  if (error) {
    logError("getInvestorStatements", error, { userId, assetCode });
    throw error;
  }

  return (data as any[] || []).map(s => ({
    ...s,
    period_month: s.month,
    period_year: s.year,
    fund_name: s.asset_code,
    begin_balance: s.beginning_balance,
    end_balance: s.ending_balance,
    rate_of_return_mtd: s.rate_of_return
  })) as unknown as MonthlyStatement[];
}

/**
 * Get available years for statement filtering
 */
export async function getStatementYears(userId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from("monthly_statements_view" as any)
    .select("year")
    .eq("investor_id", userId);

  if (error) return [new Date().getFullYear()];

  const years = [...new Set((data as any[] || []).map(s => s.year))];
  return (years as number[]).sort((a, b) => b - a);
}

/**
 * Get available assets for statement filtering
 */
export async function getStatementAssets(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("monthly_statements_view" as any)
    .select("asset_code")
    .eq("investor_id", userId);

  if (error) return [];

  const assets = [...new Set((data as any[] || []).map(s => s.asset_code))];
  return assets as string[];
}

/**
 * Get HTML content for a specific statement (P2 Polish)
 */
export async function getStatementHtmlContent(
  userId: string,
  periodYear: number,
  periodMonth: number
): Promise<string> {
  const { data, error } = await supabase
    .from("monthly_statements_html" as any)
    .select("html_content")
    .eq("investor_id", userId)
    .eq("year", periodYear)
    .eq("month", periodMonth)
    .maybeSingle();

  if (error) {
    logError("getStatementHtmlContent", error, { userId, periodYear, periodMonth });
    throw error;
  }

  return (data as any)?.html_content || "";
}
