/**
 * Profile Settings Hooks
 * React Query hooks for profile and settings operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks";
import { useAuth } from "@/services/auth";
import * as profileService from "@/features/investor/settings/services/profileSettingsService";
import { updatePassword } from "@/services/auth/authService";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { logError } from "@/lib/logger";

/**
 * Hook to fetch personal info
 */
export function usePersonalInfo() {
  const { user } = useAuth();
  const { toast } = useToast();

  return useQuery({
    queryKey: QUERY_KEYS.personalInfo(user?.id || ""),
    queryFn: async () => {
      if (!user) return null;
      return profileService.getPersonalInfo(user.id);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    meta: {
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to load your profile information",
          variant: "destructive",
        });
      },
    },
  });
}

/**
 * Hook to update personal info
 */
export function useUpdatePersonalInfo() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: {
      first_name?: string;
      last_name?: string;
      phone?: string;
      avatar_url?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      return profileService.updatePersonalInfo(user.id, updates);
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.personalInfo(user.id) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorProfile(user.id) });
      }
      toast({
        title: "Success",
        description: "Your personal information has been updated",
      });
    },
    onError: (error) => {
      logError("useUpdatePersonalInfo", error);
      toast({
        title: "Error",
        description: "Failed to update your personal information",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to fetch notification preferences
 */
export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.notificationPrefs(user?.id || ""),
    queryFn: async () => {
      if (!user) return profileService.DEFAULT_NOTIFICATION_PREFERENCES;
      return profileService.getNotificationPreferences(user.id);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: profileService.NotificationPreferences) => {
      if (!user) throw new Error("Not authenticated");
      return profileService.updateNotificationPreferences(user.id, preferences);
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notificationPrefs(user.id) });
      }
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: (error) => {
      logError("useUpdateNotificationPreferences", error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to change password
 */
export function useChangePassword() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: updatePassword,
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error: Error) => {
      logError("useChangePassword", error);
      toast({
        title: "Password change failed",
        description: error.message || "Failed to update your password",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to get current user's email
 */
export function useUserEmail() {
  return useQuery({
    queryKey: QUERY_KEYS.userEmail,
    queryFn: profileService.getUserEmail,
    staleTime: Infinity,
  });
}

/**
 * Hook to save local preferences (localStorage-based)
 */
export function useSaveLocalPreferences() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (preferences: Record<string, unknown>) => {
      profileService.saveLocalPreferences(preferences);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your preferences have been saved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your preferences",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to load local preferences
 */
export function useLocalPreferences() {
  return useQuery({
    queryKey: QUERY_KEYS.localPreferences,
    queryFn: () => profileService.loadLocalPreferences(),
    staleTime: Infinity,
  });
}

// Re-export types
export type {
  PersonalInfo,
  NotificationPreferences,
} from "@/features/investor/settings/services/profileSettingsService";
export { DEFAULT_NOTIFICATION_PREFERENCES } from "@/features/investor/settings/services/profileSettingsService";
