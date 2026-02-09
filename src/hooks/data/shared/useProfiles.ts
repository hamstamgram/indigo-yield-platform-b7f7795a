/**
 * useProfiles - Data hook for user profile operations
 * Delegates to profileService for all database operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc/index";
import { useToast } from "@/hooks";
import { logError } from "@/lib/logger";
import { profileService } from "@/services/shared";
import { QUERY_KEYS } from "@/constants/queryKeys";

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  created_at: string;
}

/**
 * Fetch all user profiles (admin only)
 */
export function useProfiles() {
  const { toast } = useToast();

  return useQuery<UserProfile[]>({
    queryKey: QUERY_KEYS.profiles,
    queryFn: () => profileService.getProfilesWithAdmin() as Promise<UserProfile[]>,
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
      return profileService.getFullProfile(userId);
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
    queryFn: () => profileService.getCurrentProfileRaw(),
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
      const { data, error, success } = await rpc.callNoArgs("is_super_admin");
      if (!success || error) {
        throw new Error(error?.userMessage || "Failed to check super admin status");
      }
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
    mutationFn: async ({ userId, currentStatus }: { userId: string; currentStatus: boolean }) => {
      return profileService.toggleAdminStatus(userId, currentStatus);
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
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<UserProfile> }) => {
      return profileService.updateProfile(userId, updates);
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
    queryKey: QUERY_KEYS.investorsForTransaction,
    queryFn: () => profileService.getInvestorsForTransaction(),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get investor profile with their primary fund (for admin transactions tab)
 */
export function useInvestorProfileWithFund(investorId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.investorProfileWithFund(investorId || ""),
    queryFn: () => profileService.getInvestorProfileWithFund(investorId!),
    enabled: !!investorId,
  });
}
