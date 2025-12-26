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
   * Get active investors (non-admin, active profiles)
   */
  async getActiveInvestors(): Promise<ProfileSummary[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .eq("status", "active")
      .eq("is_admin", false)
      .order("last_name");

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
  async getActiveFunds(): Promise<Array<{ id: string; name: string; code: string; asset: string }>> {
    const { data, error } = await supabase
      .from("funds")
      .select("id, name, code, asset")
      .eq("status", "active")
      .order("name");

    if (error) throw error;
    return data || [];
  }

  /**
   * Get current user's profile
   */
  async getMyProfile(): Promise<ProfileSummary | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return this.getById(user.id);
  }

  /**
   * Count documents for a user
   */
  async countDocuments(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) throw error;
    return count || 0;
  }
}

export const profileService = new ProfileService();
