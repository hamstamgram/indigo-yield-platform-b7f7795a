/**
 * useProfiles - Data hook for user profile operations
 * Abstracts Supabase calls from components
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks";
import { logError } from "@/lib/logger";

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  created_at: string;
}

const QUERY_KEYS = {
  profiles: ["profiles"] as const,
  profile: (id: string) => ["profiles", id] as const,
  currentProfile: ["profiles", "current"] as const,
  isSuperAdmin: ["profiles", "is-super-admin"] as const,
};

/**
 * Fetch all user profiles (admin only)
 */
export function useProfiles() {
  const { toast } = useToast();

  return useQuery<UserProfile[]>({
    queryKey: QUERY_KEYS.profiles,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, is_admin, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    meta: {
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to fetch user data",
          variant: "destructive",
        });
      },
    },
  });
}

/**
 * Fetch a single profile by ID
 */
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.profile(userId || ""),
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch the current logged-in user's profile
 */
export function useCurrentProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.currentProfile,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Check if current user is super admin
 */
export function useIsSuperAdmin() {
  return useQuery<boolean>({
    queryKey: QUERY_KEYS.isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_super_admin");
      if (error) throw error;
      return !!data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Toggle admin status for a user
 */
export function useToggleAdminStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      userId,
      currentStatus,
    }: {
      userId: string;
      currentStatus: boolean;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_admin: !currentStatus })
        .eq("id", userId);

      if (error) throw error;
      return !currentStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profiles });
      toast({
        title: "Success",
        description: `User admin status ${newStatus ? "granted" : "revoked"}`,
      });
    },
    onError: (error) => {
      logError("toggleAdminStatus", error);
      toast({
        title: "Error",
        description: "Failed to update admin status",
        variant: "destructive",
      });
    },
  });
}

/**
 * Update a user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: Partial<UserProfile>;
    }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profiles });
      toast({
        title: "Profile updated",
        description: "Profile has been saved successfully.",
      });
    },
    onError: (error) => {
      logError("updateProfile", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });
}

/**
 * Get investors for transaction selector (active, non-admin)
 */
export function useInvestorsForTransaction(enabled: boolean = true) {
  return useQuery({
    queryKey: ["investors", "forTransaction"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .eq("is_admin", false)
        .order("last_name");

      if (error) throw error;

      return (data || []).map((p) => ({
        id: p.id,
        email: p.email,
        displayName: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
        isSystemAccount: false,
      }));
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get investor profile with their primary fund (for admin transactions tab)
 */
export function useInvestorProfileWithFund(investorId: string | undefined) {
  return useQuery({
    queryKey: ["investor", "profileWithFund", investorId],
    queryFn: async () => {
      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .eq("id", investorId!)
        .single();

      if (profileError) throw profileError;

      // Get positions to find primary fund
      const { data: positions } = await supabase
        .from("investor_positions")
        .select("fund_id")
        .eq("investor_id", investorId!)
        .limit(1);

      // Get default fund if no position
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
    },
    enabled: !!investorId,
  });
}
