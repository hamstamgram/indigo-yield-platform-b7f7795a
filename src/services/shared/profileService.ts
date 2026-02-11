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
   * NOTE: generated_reports table was dropped - returns empty
   */
  async getMonthlyReports(_investorId: string, _reportMonth: string): Promise<any[]> {
    return [];
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

  /**
   * Update profile via secure RPC (validates permissions server-side)
   */
  async updateProfileSecure(params: {
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

  /**
   * Get last activity dates for multiple investors (batch)
   */
  async getLastActivityBatch(investorIds: string[]): Promise<Map<string, string>> {
    if (investorIds.length === 0) return new Map();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, last_activity_at")
      .in("id", investorIds);

    if (error) throw error;

    const result = new Map<string, string>();
    (data || []).forEach((p) => {
      if (p.id && p.last_activity_at) {
        result.set(p.id, p.last_activity_at);
      }
    });
    return result;
  }

  /**
   * Get IB parent relationships for multiple investors (batch)
   */
  async getIBParentsBatch(investorIds: string[]): Promise<Map<string, string>> {
    if (investorIds.length === 0) return new Map();

    // Get investors with IB parents
    const { data: investorsWithIB, error: ibError } = await supabase
      .from("profiles")
      .select("id, ib_parent_id")
      .in("id", investorIds)
      .not("ib_parent_id", "is", null);

    if (ibError) throw ibError;

    const ibParentIds = [
      ...new Set(
        (investorsWithIB || []).map((p) => p.ib_parent_id).filter((id): id is string => Boolean(id))
      ),
    ];

    if (ibParentIds.length === 0) return new Map();

    // Get parent names
    const { data: parents, error: parentError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", ibParentIds);

    if (parentError) throw parentError;

    const ibParentNames = new Map<string, string>();
    (parents || []).forEach((p) => {
      if (p.id) {
        const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
        ibParentNames.set(p.id, name);
      }
    });

    // Map investor -> parent name
    const result = new Map<string, string>();
    (investorsWithIB || []).forEach((p) => {
      if (p.id && p.ib_parent_id && ibParentNames.has(p.ib_parent_id)) {
        result.set(p.id, ibParentNames.get(p.ib_parent_id)!);
      }
    });

    return result;
  }
}

export const profileService = new ProfileService();
