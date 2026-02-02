/**
 * Auth Mutations Hooks
 * React Query hooks for authentication operations
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as authService from "@/services/auth/authService";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { logError } from "@/lib/logger";

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Hook for email/password login
 */
export function useLoginMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: LoginData) => {
      const result = await authService.signIn(data);
      if (result.error) throw result.error;

      // Check admin status after successful login
      let isAdmin = false;
      try {
        isAdmin = await authService.getUserAdminStatus(result.data.user.id);
      } catch (adminCheckError) {
        // If admin check fails, default to non-admin (safer for production)
        logError("useLoginMutation:adminCheck", adminCheckError as Error);
      }

      return { ...result.data, isAdmin };
    },
    onSuccess: ({ isAdmin }) => {
      toast.success("Welcome back!");
      // Redirect based on role - DashboardLayout provides safety net if this fails
      navigate(isAdmin ? "/admin" : "/dashboard", { replace: true });
    },
    onError: (error: Error) => {
      logError("useLoginMutation", error);
      toast.error(error.message || "Invalid email or password");
    },
  });
}

/**
 * Hook for Google OAuth login
 */
export function useGoogleLoginMutation() {
  return useMutation({
    mutationFn: async () => {
      const result = await authService.signInWithOAuth("google");
      if (result.error) throw result.error;
      return result.data;
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to sign in with Google");
    },
  });
}

/**
 * Hook for user registration
 */
export function useRegisterMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const result = await authService.signUp({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      toast.success("Registration successful! Please check your email to verify your account.");
      navigate("/verify-email");
    },
    onError: (error: Error) => {
      logError("useRegisterMutation", error);
      toast.error(error.message || "Failed to create account");
    },
  });
}

/**
 * Hook for email verification via OTP
 */
export function useEmailVerification(tokenHash: string | null) {
  const navigate = useNavigate();

  return useQuery({
    queryKey: QUERY_KEYS.emailVerification(tokenHash || ""),
    queryFn: async () => {
      if (!tokenHash) throw new Error("No token provided");

      const result = await authService.verifyOtp(tokenHash);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!tokenHash,
    retry: false,
    staleTime: Infinity,
    meta: {
      onSuccess: () => {
        toast.success("Email verified successfully!");
        setTimeout(() => navigate("/dashboard"), 2000);
      },
      onError: () => {
        toast.error("Failed to verify email");
      },
    },
  });
}

/**
 * Hook for resending verification email
 */
export function useResendVerificationEmail() {
  return useMutation({
    mutationFn: async (email?: string) => {
      let targetEmail = email;

      if (!targetEmail) {
        const user = await authService.getUser();
        targetEmail = user?.email;
      }

      if (!targetEmail) throw new Error("No email address found");

      const result = await authService.resendVerificationEmail(targetEmail);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      toast.success("Verification email sent! Please check your inbox.");
    },
    onError: (error: Error) => {
      logError("useResendVerificationEmail", error);
      toast.error("Failed to resend verification email");
    },
  });
}
