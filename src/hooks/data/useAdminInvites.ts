/**
 * useAdminInvites - Data hook for admin invitation operations
 * Abstracts Supabase calls from AdminInvites component
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AdminInvite {
  id: string;
  email: string;
  invite_code: string;
  created_at: string;
  expires_at: string;
  used: boolean | null;
  created_by: string | null;
}

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
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_super_admin");
      if (error) throw error;
      return !!data;
    },
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_invites")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as AdminInvite[];
    },
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
      const { data, error } = await supabase.rpc("create_admin_invite", {
        p_email: email.toLowerCase().trim(),
      });

      if (error) {
        if (error.message?.includes("Super admin")) {
          throw new Error("Only super admins can create admin invitations.");
        } else if (error.message?.includes("already exists")) {
          throw new Error("An invitation for this email already exists.");
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invites });
      toast({
        title: "Invitation Created",
        description: "Admin invitation has been created successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Error creating invite:", error);
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
    mutationFn: async (invite: AdminInvite) => {
      const { error } = await supabase.functions.invoke("send-admin-invite", {
        body: { invite },
      });

      if (error) throw error;
      return invite;
    },
    onSuccess: (invite) => {
      toast({
        title: "Invitation Sent",
        description: `Invitation email sent to ${invite.email}`,
      });
    },
    onError: (error) => {
      console.error("Error sending invite:", error);
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
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_invites")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invites });
      toast({
        title: "Invitation Deleted",
        description: "Admin invitation has been deleted.",
      });
    },
    onError: (error) => {
      console.error("Error deleting invite:", error);
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
    const link = `${window.location.origin}/admin-invite?code=${inviteCode}`;
    navigator.clipboard.writeText(link);

    toast({
      title: "Link Copied",
      description: "Invitation link copied to clipboard",
    });
  };
}
