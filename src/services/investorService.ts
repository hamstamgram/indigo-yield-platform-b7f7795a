import { supabase } from "@/integrations/supabase/client";

// Legacy investor type from investorTypes
interface LegacyInvestor {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  fee_percentage?: number;
  portfolio_summary?: Record<string, { balance: number; usd_value: number }>;
}

/**
 * Checks if the current user has admin privileges
 * @returns Boolean indicating admin status and username
 */
export const checkAdminStatus = async (): Promise<{ isAdmin: boolean | null }> => {
  try {
    // Check if user is logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isAdmin: false };
    }

    // Direct query to check admin status (get_profile_by_id RPC doesn't exist)
    try {
      const { data: profileData, error: directError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (directError) {
        throw directError;
      }

      const isUserAdmin = profileData?.is_admin === true;
      return { isAdmin: isUserAdmin };
    } catch (directError) {
      console.error("Error checking admin status:", directError);
      return { isAdmin: false };
    }
  } catch (error) {
    console.error("Error in checkAdminStatus:", error);
    return { isAdmin: false };
  }
};

/**
 * Fetches all investors (non-admin users) from the system
 * @returns Array of legacy investors
 */
export const fetchInvestors = async (): Promise<LegacyInvestor[]> => {
  try {
    // Direct query (get_all_non_admin_profiles RPC doesn't exist)
    const { data: directData, error: directError } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, created_at, fee_percentage")
      .eq("is_admin", false);

    if (directError) {
      console.error("Error fetching profiles:", directError);
      throw new Error(`Failed to fetch investors: ${directError.message}`);
    }

    return mapProfilesToInvestors(directData || []);
  } catch (error) {
    console.error("Error fetching investors:", error);
    throw error;
  }
};

/**
 * Helper function to map profiles data to investors format
 */
const mapProfilesToInvestors = (profiles: any[]): LegacyInvestor[] => {
  if (!profiles || profiles.length === 0) return [];

  return profiles.map((profile) => ({
    id: profile.id || "",
    email: profile.email || "",
    first_name: profile.first_name || null,
    last_name: profile.last_name || null,
    created_at: profile.created_at || new Date().toISOString(),
    fee_percentage: profile.fee_percentage || 2.0,
    portfolio_summary: {},
  }));
};

/**
 * Fetches pending invites that haven't been used yet
 * @returns Array of legacy investors formed from pending invites
 */
export const fetchPendingInvites = async (): Promise<LegacyInvestor[]> => {
  try {
    const { data: invitesData, error: invitesError } = await supabase
      .from("admin_invites")
      .select("email, created_at")
      .eq("used", false);

    if (invitesError) {
      console.error("Error fetching invites:", invitesError);
      return [];
    }

    if (invitesData && invitesData.length > 0) {
      return invitesData.map((invite) => ({
        id: "",
        email: invite.email,
        first_name: null,
        last_name: null,
        created_at: invite.created_at || new Date().toISOString(),
        portfolio_summary: {},
      }));
    }

    return [];
  } catch (error) {
    console.error("Error fetching invites:", error);
    return [];
  }
};
