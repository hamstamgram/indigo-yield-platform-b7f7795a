/**
 * Auth Mutations Hooks
 * React Query hooks for authentication operations
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as authService from "@/services/auth/authService";
import * as mfaService from "@/services/auth/mfaService";
import QRCode from "qrcode";
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
      console.log("[useLoginMutation] Starting login...");
      const result = await authService.signIn(data);
      if (result.error) throw result.error;
      
      console.log("[useLoginMutation] Login successful, checking admin status for user:", result.data.user.id);
      // Check admin status after successful login
      const isAdmin = await authService.getUserAdminStatus(result.data.user.id);
      console.log("[useLoginMutation] Admin status:", isAdmin);
      return { ...result.data, isAdmin };
    },
    onSuccess: ({ isAdmin }) => {
      console.log("[useLoginMutation] onSuccess - isAdmin:", isAdmin, "navigating to:", isAdmin ? "/admin" : "/dashboard");
      toast.success("Welcome back!");
      // Redirect based on role
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
 * Hook for MFA enrollment
 */
export function useMFAEnrollment() {
  return useQuery({
    queryKey: ["mfa-enrollment"],
    queryFn: async () => {
      const result = await mfaService.enrollMFA();
      if (!result.success || !result.data) throw result.error || new Error("Failed to enroll");
      
      const qrCodeUrl = await QRCode.toDataURL(result.data.qrCode);
      return {
        secret: result.data.secret,
        qrCodeUrl,
      };
    },
    staleTime: Infinity,
    retry: false,
  });
}

/**
 * Hook for MFA verification
 */
export function useMFAVerification() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (code: string) => {
      const factorsResult = await mfaService.listMFAFactors();
      if (factorsResult.error) throw factorsResult.error;

      const totpFactors = factorsResult.data?.totp;
      if (!totpFactors || totpFactors.length === 0) {
        throw new Error("No MFA factor found");
      }

      const factorId = totpFactors[0].id;
      const verifyResult = await mfaService.verifyMFA(factorId, code);
      if (verifyResult.error) throw verifyResult.error;
      
      return verifyResult.data;
    },
    onSuccess: () => {
      toast.success("MFA setup complete!");
      setTimeout(() => navigate("/dashboard"), 2000);
    },
    onError: (error: Error) => {
      logError("useMFAVerification", error);
      toast.error("Invalid verification code");
    },
  });
}

/**
 * Hook for email verification via OTP
 */
export function useEmailVerification(tokenHash: string | null) {
  const navigate = useNavigate();

  return useQuery({
    queryKey: ["email-verification", tokenHash],
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
