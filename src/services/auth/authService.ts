/**
 * Auth Service
 * Consolidated authentication operations
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import type { User, Session } from "@supabase/supabase-js";
import type { SignInData, SignUpData, SignInResult, AuthResponse } from "./types";
import type { Database } from "@/integrations/supabase/types";

/**
 * Sign in with email and password
 */
export async function signIn(
  data: SignInData
): Promise<AuthResponse<{ user: User; session: Session }>> {
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  return { data: authData, error, success: !error };
}

/**
 * Sign in with email and password (throws on error)
 */
export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user || !data.session) {
    throw new Error("No user returned from login");
  }

  return { user: data.user, session: data.session };
}

/**
 * Sign up a new user
 */
export async function signUp(
  data: SignUpData
): Promise<AuthResponse<{ user: User | null; session: Session | null }>> {
  const redirectUrl = `${window.location.origin}/`;

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
      },
    },
  });

  return { data: authData, error, success: !error };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(
  provider: "google",
  redirectTo?: string
): Promise<AuthResponse<{ url: string } | null>> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: redirectTo ?? `${window.location.origin}/dashboard` },
  });
  return { data, error, success: !error };
}

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Get the current user
 */
export async function getUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
}

/**
 * Request password reset email
 */
export async function resetPasswordForEmail(email: string): Promise<AuthResponse<object>> {
  const redirectUrl = `${window.location.origin}/reset-password`;

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });

  return { data, error, success: !error };
}

/**
 * Set session from recovery tokens
 */
export async function setSessionFromTokens(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}

/**
 * Get user admin status
 */
export async function getUserAdminStatus(userId: string): Promise<boolean> {
  const { data: adminStatus } = await rpc.call("get_user_admin_status", {
    user_id: userId,
  });
  return adminStatus === true;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null, session);
  });

  return () => subscription.unsubscribe();
}

/**
 * Verify OTP (for email verification)
 */
export async function verifyOtp(
  tokenHash: string,
  type: "email" = "email"
): Promise<AuthResponse<{ user: User | null; session: Session | null }>> {
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  return { data, error, success: !error };
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string): Promise<AuthResponse<object>> {
  const { data, error } = await supabase.auth.resend({
    type: "signup",
    email,
  });
  return { data, error, success: !error };
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return { success: true };
}
