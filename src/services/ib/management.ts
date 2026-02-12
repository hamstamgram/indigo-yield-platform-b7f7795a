/**
 * IB Management Service
 * Handles IB role assignment and management
 */

import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db/index";

class IBManagementService {
  /**
   * Create IB role for a user
   * Returns the user ID if successful
   */
  async createIB(email: string): Promise<{ userId: string }> {
    // First, check if user already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (checkError) throw checkError;

    if (!existingProfile) {
      throw new Error(
        "User profile does not exist. Please invite this user first through the investor invite flow, then assign IB role."
      );
    }

    const userId = existingProfile.id;

    // Check if already has IB role
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "ib")
      .maybeSingle();

    if (existingRole) {
      throw new Error("This user is already an IB.");
    }

    // Add IB role
    const { error: roleError } = await db.insert("user_roles", {
      user_id: userId,
      role: "ib",
    });

    if (roleError) throw new Error(roleError.userMessage);

    return { userId };
  }

  /**
   * Create IB role (alias for createIB)
   */
  async createIBRole(email: string): Promise<{ userId: string }> {
    return this.createIB(email);
  }

  /**
   * Assign IB role to a user by ID
   */
  async assignIBRoleToUser(userId: string): Promise<{ alreadyExists: boolean }> {
    const { error } = await db.insert("user_roles", {
      user_id: userId,
      role: "ib",
    });

    if (error) {
      if (error.code === "23505") {
        return { alreadyExists: true };
      }
      throw new Error(error.userMessage);
    }

    return { alreadyExists: false };
  }

  /**
   * Remove IB role from a user
   */
  async removeIBRole(userId: string): Promise<void> {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "ib");

    if (error) throw error;
  }

  /**
   * Check if user has IB role
   */
  async hasIBRole(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "ib")
      .maybeSingle();

    if (error) throw error;
    return !!data;
  }

  /**
   * Get all IB roles
   */
  async getIBRoles(): Promise<Array<{ user_id: string; role: string }>> {
    const { data, error } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "ib");

    if (error) throw error;
    return data || [];
  }

  /**
   * Get profiles by IDs
   */
  async getProfilesByIds(userIds: string[]): Promise<
    Array<{
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      created_at: string;
    }>
  > {
    if (!userIds.length) return [];

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, created_at")
      .in("id", userIds);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get referrals by parent IDs (investors with ib_parent_id)
   */
  async getReferralsByParentIds(parentIds: string[]): Promise<
    Array<{
      id: string;
      ib_parent_id: string | null;
    }>
  > {
    if (!parentIds.length) return [];

    const { data, error } = await supabase
      .from("profiles")
      .select("id, ib_parent_id")
      .in("ib_parent_id", parentIds);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get IB credits from transactions
   */
  async getIBCredits(ibUserIds: string[]): Promise<
    Array<{
      investor_id: string;
      fund_id: string;
      asset: string;
      amount: number;
    }>
  > {
    if (!ibUserIds.length) return [];

    const { data, error } = await supabase
      .from("transactions_v2")
      .select("investor_id, fund_id, asset, amount")
      .in("investor_id", ibUserIds)
      .eq("type", "IB_CREDIT")
      .eq("is_voided", false);

    if (error) throw error;
    return (data || []).map((row) => ({
      investor_id: row.investor_id,
      fund_id: row.fund_id ?? "",
      asset: row.asset ?? "",
      amount: String(row.amount || "0"),
    }));
  }

  /**
   * Get IB allocations
   */
  async getIBAllocations(ibUserIds: string[]): Promise<
    Array<{
      ib_investor_id: string;
      fund_id: string | null;
      ib_fee_amount: string;
      source_investor_name: string | null;
    }>
  > {
    if (!ibUserIds.length) return [];

    const { data, error } = await supabase
      .from("ib_allocations")
      .select(
        "ib_investor_id, fund_id, ib_fee_amount, source_investor_id, source_investor:profiles!ib_allocations_source_investor_id_fkey(first_name, last_name)"
      )
      .in("ib_investor_id", ibUserIds)
      .eq("is_voided", false)
      .limit(1000);

    if (error) throw error;
    return (data || []).map((row) => {
      const profile = (row as Record<string, unknown>).source_investor as {
        first_name?: string;
        last_name?: string;
      } | null;
      return {
        ib_investor_id: row.ib_investor_id,
        fund_id: row.fund_id,
        ib_fee_amount: String(row.ib_fee_amount || "0"),
        source_investor_name: profile
          ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || null
          : null,
      };
    });
  }
}

export const ibManagementService = new IBManagementService();
