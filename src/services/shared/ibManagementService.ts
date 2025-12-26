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
}

export const ibManagementService = new IBManagementService();
