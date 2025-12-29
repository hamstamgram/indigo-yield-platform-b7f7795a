/**
 * Admin Users Management Hooks
 * React Query hooks for managing admin users
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useToast } from "@/hooks";
import {
  adminUsersService,
  type AdminUserProfile,
  type AdminInviteParams,
} from "@/services/admin/adminUsersService";

/**
 * Hook to fetch all users for admin management
 */
export function useAdminUsers() {
  return useQuery<AdminUserProfile[]>({
    queryKey: ["admin", "users", "all"],
    queryFn: adminUsersService.fetchAllUsers,
  });
}

/**
 * Hook to toggle admin status
 */
export function useToggleAdminStatusMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, currentStatus }: { userId: string; currentStatus: boolean }) =>
      adminUsersService.toggleAdminStatus(userId, currentStatus),
    onSuccess: (_, { currentStatus }) => {
      toast({
        title: "Success",
        description: `User admin status ${!currentStatus ? "granted" : "revoked"}`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update admin status",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to send admin invite
 */
export function useSendAdminInviteMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: AdminInviteParams) =>
      adminUsersService.sendAdminInvite(params),
    onSuccess: (_, { email }) => {
      toast({
        title: "Invitation Sent",
        description: `An admin invitation has been sent to ${email}`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "invites"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Invitation Failed",
        description: error.message || "Failed to send admin invitation",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to check if current user is super admin
 */
export function useSuperAdminCheck(userId: string | undefined) {
  return useQuery<boolean>({
    queryKey: ["admin", "superAdmin", userId],
    queryFn: () => adminUsersService.checkSuperAdminRole(userId!),
    enabled: !!userId,
  });
}

// Re-export types
export type { AdminUserProfile, AdminInviteParams };
