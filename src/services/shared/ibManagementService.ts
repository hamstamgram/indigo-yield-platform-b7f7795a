/**
 * IB Management Service
 * Handles IB role assignment and management
 */

import { supabase } from "@/integrations/supabase/client";

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
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "ib",
    });

    if (roleError) throw roleError;

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
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "ib",
    });

    if (error) {
      if (error.code === "23505") {
        return { alreadyExists: true };
      }
      throw error;
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
  async getProfilesByIds(userIds: string[]): Promise<Array<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    created_at: string;
  }>> {
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
  async getReferralsByParentIds(parentIds: string[]): Promise<Array<{
    id: string;
    ib_parent_id: string;
  }>> {
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
  async getIBCredits(ibUserIds: string[]): Promise<Array<{
    investor_id: string;
    fund_id: string | null;
    asset: string | null;
    amount: number;
  }>> {
    if (!ibUserIds.length) return [];

    const { data, error } = await supabase
      .from("transactions_v2")
      .select("investor_id, fund_id, asset, amount")
      .in("investor_id", ibUserIds)
      .eq("type", "IB_CREDIT");

    if (error) throw error;
    return data || [];
  }

  /**
   * Get IB allocations
   */
  async getIBAllocations(ibUserIds: string[]): Promise<Array<{
    ib_investor_id: string;
    fund_id: string | null;
    ib_fee_amount: number;
  }>> {
    if (!ibUserIds.length) return [];

    const { data, error } = await supabase
      .from("ib_allocations")
      .select("ib_investor_id, fund_id, ib_fee_amount")
      .in("ib_investor_id", ibUserIds)
      .eq("is_voided", false);

    if (error) throw error;
    return data || [];
  }
}

export const ibManagementService = new IBManagementService();
