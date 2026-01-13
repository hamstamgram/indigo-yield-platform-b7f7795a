/**
 * Auth Flow Hooks
 * React Query hooks for authentication operations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks";
import * as authService from "@/services/auth/authService";
import * as inviteService from "@/services/auth/inviteService";
import { logError } from "@/lib/logger";

const QUERY_KEYS = {
  session: ["auth", "session"] as const,
  adminStatus: (userId: string) => ["auth", "adminStatus", userId] as const,
  investorInvite: (code: string) => ["auth", "investorInvite", code] as const,
  adminInvite: (code: string) => ["auth", "adminInvite", code] as const,
};

/**
 * Hook to sign in with email/password
 */
export function useSignIn() {
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await authService.signInWithEmail(email, password);
      const isAdmin = await authService.getUserAdminStatus(result.user.id);
      return { ...result, isAdmin };
    },
    onSuccess: ({ isAdmin }) => {
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      navigate(isAdmin ? "/admin" : "/dashboard", { replace: true });
    },
    onError: (error: Error) => {
      logError("signIn", error);
    },
  });
}

/**
 * Hook to sign out
 */
export function useSignOut() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.signOut,
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
      navigate("/");
    },
    onError: () => {
      toast({
        title: "Log out failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to request password reset
 */
export function useRequestPasswordReset() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (email: string) => {
      const result = await authService.resetPasswordForEmail(email);
      if (!result.success) throw result.error;
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Reset link sent",
        description: "Check your email for the password reset link.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to reset password (update with new password)
 */
export function useResetPassword() {
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authService.updatePassword,
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated.",
      });
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to verify investor invite
 */
export function useVerifyInvestorInvite(inviteCode: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.investorInvite(inviteCode || ""),
    queryFn: async () => {
      if (!inviteCode) throw new Error("No invite code provided");
      return inviteService.verifyInvestorInvite(inviteCode);
    },
    enabled: !!inviteCode,
    retry: false,
  });
}

/**
 * Hook to verify admin invite
 */
export function useVerifyAdminInvite(inviteCode: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.adminInvite(inviteCode || ""),
    queryFn: async () => {
      if (!inviteCode) throw new Error("No invite code provided");
      return inviteService.verifyAdminInvite(inviteCode);
    },
    enabled: !!inviteCode,
    retry: false,
  });
}

/**
 * Hook to accept investor invite
 */
export function useAcceptInvestorInvite() {
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({
      inviteCode,
      email,
      password,
      firstName,
      lastName,
    }: {
      inviteCode: string;
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    }) => {
      return inviteService.acceptInvestorInvite(inviteCode, email, password, {
        first_name: firstName,
        last_name: lastName,
      });
    },
    onSuccess: () => {
      toast({
        title: "Account Created",
        description: "Your investor account has been created successfully.",
      });
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while creating your account.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to accept admin invite
 */
export function useAcceptAdminInvite() {
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({
      inviteCode,
      email,
      password,
      firstName,
      lastName,
    }: {
      inviteCode: string;
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    }) => {
      return inviteService.acceptAdminInvite(inviteCode, email, password, {
        first_name: firstName,
        last_name: lastName,
      });
    },
    onSuccess: () => {
      toast({
        title: "Account Created",
        description: "Your admin account has been created successfully.",
      });
      setTimeout(() => {
        navigate("/admin");
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while creating your account.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to check current session and redirect if authenticated
 */
export function useCheckAuthSession() {
  const navigate = useNavigate();

  return useQuery({
    queryKey: QUERY_KEYS.session,
    queryFn: async () => {
      const session = await authService.getSession();
      if (!session) return null;

      const isAdmin = await authService.getUserAdminStatus(session.user.id);
      return { session, isAdmin };
    },
    staleTime: 60 * 1000, // 1 minute - session doesn't change frequently
  });
}

/**
 * Hook to set session from recovery tokens
 */
export function useSetSessionFromTokens() {
  return useMutation({
    mutationFn: ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) =>
      authService.setSessionFromTokens(accessToken, refreshToken),
  });
}

// Re-export types
export type { InviteDetails, UserMetadata, SignInResult } from "@/services/auth/types";
