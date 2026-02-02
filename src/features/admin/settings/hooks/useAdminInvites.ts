/**
 * useAdminInvites - Data hook for admin invitation operations
 * Uses adminInviteService for database operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks";
import { adminInviteService } from "@/services/admin/adminInviteService";
import { logError } from "@/lib/logger";

// Re-export type from service for consistency
import type { AdminInvite } from "@/services/admin/adminInviteService";
export type { AdminInvite } from "@/services/admin/adminInviteService";

const QUERY_KEYS = {
  invites: ["admin-invites"] as const,
  isSuperAdmin: ["is-super-admin"] as const,
};

/**
 * Check if current user is super admin
 */
export function useIsSuperAdmin() {
  return useQuery<boolean>({
    queryKey: QUERY_KEYS.isSuperAdmin,
    queryFn: () => adminInviteService.isSuperAdmin(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch all admin invites
 */
export function useAdminInvites() {
  const { toast } = useToast();

  return useQuery<AdminInvite[]>({
    queryKey: QUERY_KEYS.invites,
    queryFn: () => adminInviteService.getAll(),
    staleTime: 2 * 60 * 1000,
    meta: {
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to fetch invitation data",
          variant: "destructive",
        });
      },
    },
  });
}

/**
 * Create a new admin invite
 */
export function useCreateAdminInvite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (email: string) => {
      return adminInviteService.create(email, "admin");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invites });
      toast({
        title: "Invitation Created",
        description: "Admin invitation has been created successfully.",
      });
    },
    onError: (error: Error) => {
      logError("createAdminInvite", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invitation",
        variant: "destructive",
      });
    },
  });
}

/**
 * Send an admin invite email
 */
export function useSendAdminInvite() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (invite: AdminInvite) => adminInviteService.sendInviteEmail(invite),
    onSuccess: (_, invite) => {
      toast({
        title: "Invitation Sent",
        description: `Invitation email sent to ${invite.email}`,
      });
    },
    onError: (error) => {
      logError("sendAdminInvite", error);
      toast({
        title: "Error",
        description: "Failed to send invitation email",
        variant: "destructive",
      });
    },
  });
}

/**
 * Delete an admin invite
 */
export function useDeleteAdminInvite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => adminInviteService.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invites });
      toast({
        title: "Invitation Deleted",
        description: "Admin invitation has been deleted.",
      });
    },
    onError: (error) => {
      logError("deleteAdminInvite", error);
      toast({
        title: "Error",
        description: "Failed to delete invitation",
        variant: "destructive",
      });
    },
  });
}

/**
 * Copy invite link to clipboard
 */
export function useCopyInviteLink() {
  const { toast } = useToast();

  return (inviteCode: string) => {
    const link = adminInviteService.generateInviteLink(inviteCode);
    navigator.clipboard.writeText(link);

    toast({
      title: "Link Copied",
      description: "Invitation link copied to clipboard",
    });
  };
}
