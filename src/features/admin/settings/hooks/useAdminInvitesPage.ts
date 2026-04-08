/**
 * Admin Invites Page Hooks
 * React Query hooks for admin invitation management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { adminInviteService } from "@/features/admin/investors/services/adminInviteService";
import { type AdminInvite } from "@/features/admin/investors/services/adminInviteService";
import { invalidateAfterAdminInviteOp } from "@/utils/cacheInvalidation";

export type { AdminInvite };

/**
 * Hook to fetch all admin invites
 */
export function useAdminInvitesList() {
  return useQuery<AdminInvite[]>({
    queryKey: QUERY_KEYS.adminInvites,
    queryFn: () => adminInviteService.getAll(),
  });
}

interface CreateInviteCallbacks {
  onSuccess?: (data: { email: string; inviteCode: string }) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to create a new admin invite
 */
export function useCreateAdminInvite(callbacks?: CreateInviteCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      adminInviteService.create(email, role),
    onSuccess: (data) => {
      invalidateAfterAdminInviteOp(queryClient);
      callbacks?.onSuccess?.(data);
    },
    onError: (error) => {
      callbacks?.onError?.(error instanceof Error ? error : new Error("Failed to create invite"));
    },
  });
}

interface RevokeInviteCallbacks {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to revoke an admin invite
 */
export function useRevokeAdminInvite(callbacks?: RevokeInviteCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) => adminInviteService.revoke(inviteId),
    onSuccess: () => {
      invalidateAfterAdminInviteOp(queryClient);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error instanceof Error ? error : new Error("Failed to revoke invite"));
    },
  });
}
