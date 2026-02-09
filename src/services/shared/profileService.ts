/**
 * Profile Service
 * Handles profile queries and operations
 */

import { supabase } from "@/integrations/supabase/client";

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

class ProfileService {
  /**
   * Get profile by ID
   */
  async getById(profileId: string): Promise<ProfileSummary | null> {
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

  /**
   * Get profile by ID (alias for getById)
   */
  async getProfileById(profileId: string): Promise<RawProfile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, created_at")
      .eq("id", profileId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Get all profiles (for admin use)
   */
  async getAllProfiles(): Promise<RawProfile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .order("last_name")
      .limit(500);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all profiles with admin status (for admin user management)
   */
  async getProfilesWithAdmin(): Promise<
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

  /**
   * Get full profile (all columns) by ID
   */
  async getFullProfile(profileId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Get current user's profile (raw columns)
   */
  async getCurrentProfileRaw() {
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

  /**
   * Toggle admin status for a user
   */
  async toggleAdminStatus(userId: string, currentStatus: boolean): Promise<boolean> {
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: !currentStatus })
      .eq("id", userId);

    if (error) throw error;
    return !currentStatus;
  }

  /**
   * Update profile fields
   */
  async updateProfile(userId: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get investor profile with their primary fund (composite query)
   */
  async getInvestorProfileWithFund(investorId: string) {
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

    const { data: funds } = await supabase
      .from("funds")
      .select("id")
      .eq("status", "active")
      .limit(1);

    const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email;

    return {
      id: profile.id,
      name,
      email: profile.email,
      fund_id: positions?.[0]?.fund_id || funds?.[0]?.id || "",
    };
  }

  /**
   * Get active investors (non-admin, active profiles)
   */
  async getActiveInvestors(): Promise<ProfileSummary[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .eq("status", "active")
      .eq("is_admin", false)
      .order("last_name")
      .limit(500);

    if (error) throw error;

    return (data || []).map((p) => ({
      id: p.id,
      email: p.email,
      firstName: p.first_name,
      lastName: p.last_name,
      name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
    }));
  }

  /**
   * Get all active funds
   */
  async getActiveFunds(): Promise<
    Array<{ id: string; name: string; code: string; asset: string }>
  > {
    const { data, error } = await supabase
      .from("funds")
      .select("id, name, code, asset")
      .eq("status", "active")
      .order("asset", { ascending: true })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get current user's profile
   */
  async getMyProfile(): Promise<ProfileSummary | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    return this.getById(user.id);
  }

  /**
   * Count documents for a user
   */
  async countDocuments(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Get investor monthly reports from generated_reports
   */
  async getMonthlyReports(investorId: string, reportMonth: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("generated_reports")
      .select("*")
      .eq("investor_id", investorId)
      .eq("report_month", reportMonth)
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get investor fund performance (latest period)
   */
  async getInvestorFundPerformance(investorId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("investor_fund_performance")
      .select("*")
      .eq("investor_id", investorId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get investor fund performance for a specific period
   */
  async getInvestorFundPerformanceByPeriod(investorId: string, periodId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("investor_fund_performance")
      .select("*")
      .eq("investor_id", investorId)
      .eq("period_id", periodId)
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  /**
   * Update investor fee percentage
   */
  async updateFeePercentage(investorId: string, feePercentage: number): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({
        fee_pct: feePercentage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", investorId);

    if (error) throw error;
  }

  /**
   * Get non-system users for deposit forms
   */
  async getUsersForDeposits(): Promise<
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

  /**
   * Get investors for transaction selector (active, non-admin)
   */
  async getInvestorsForTransaction(): Promise<TransactionInvestor[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .eq("is_admin", false)
      .order("last_name")
      .limit(100);

    if (error) throw error;

    return (data || []).map((p) => ({
      id: p.id,
      email: p.email,
      displayName: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
      isSystemAccount: false,
    }));
  }
}

export const profileService = new ProfileService();
