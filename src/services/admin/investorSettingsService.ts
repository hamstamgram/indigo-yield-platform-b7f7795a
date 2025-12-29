/**
 * Investor Settings Service
 * Handles investor profile settings and report period data
 */

import { supabase } from "@/integrations/supabase/client";

// =====================================================
// TYPES
// =====================================================

export interface InvestorProfileData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string | null;
}

export interface ReportPeriod {
  id: string;
  year: number;
  month: number;
  hasData: boolean;
  fundCount: number;
}

// =====================================================
// SERVICE FUNCTIONS
// =====================================================

/**
 * Load investor profile for settings panel
 */
export async function getInvestorProfileForSettings(
  investorId: string
): Promise<InvestorProfileData> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone, status, created_at")
    .eq("id", investorId)
    .single();

  if (error) {
    console.error("Error loading investor profile:", error);
    throw error;
  }

  return {
    id: data.id,
    name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "Unknown",
    firstName: data.first_name || "",
    lastName: data.last_name || "",
    email: data.email || "",
    phone: data.phone,
    status: data.status || "active",
    created_at: data.created_at,
  };
}

/**
 * Delete an investor profile
 */
export async function deleteInvestorProfile(investorId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", investorId);

  if (error) {
    console.error("Error deleting investor:", error);
    throw error;
  }
}

/**
 * Get report periods and performance data for an investor
 */
export async function getInvestorReportPeriods(
  investorId: string
): Promise<{ periods: ReportPeriod[]; latestPeriod: ReportPeriod | null }> {
  // Get recent statement periods
  const { data: periodsData, error: periodsError } = await supabase
    .from("statement_periods")
    .select("id, year, month")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(6);

  if (periodsError) {
    console.error("Error fetching statement periods:", periodsError);
    throw periodsError;
  }

  if (!periodsData || periodsData.length === 0) {
    return { periods: [], latestPeriod: null };
  }

  // Get performance data for this investor across periods
  const periodIds = periodsData.map((p) => p.id);
  const { data: perfData, error: perfError } = await supabase
    .from("investor_fund_performance")
    .select("period_id, fund_name")
    .eq("investor_id", investorId)
    .in("period_id", periodIds);

  if (perfError) {
    console.error("Error fetching investor performance:", perfError);
    throw perfError;
  }

  // Build period summary
  const perfByPeriod = (perfData || []).reduce((acc, p) => {
    if (!acc[p.period_id]) acc[p.period_id] = [];
    acc[p.period_id].push(p.fund_name);
    return acc;
  }, {} as Record<string, string[]>);

  const mappedPeriods: ReportPeriod[] = periodsData.map((p) => ({
    id: p.id,
    year: p.year,
    month: p.month,
    hasData: !!perfByPeriod[p.id]?.length,
    fundCount: perfByPeriod[p.id]?.length || 0,
  }));

  const latestPeriod = mappedPeriods.find((p) => p.hasData) || null;

  return { periods: mappedPeriods, latestPeriod };
}
