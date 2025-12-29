/**
 * Auth Flow Service
 * Handles all authentication-related operations
 */

import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface SignInResult {
  user: User;
  session: Session;
}

export interface InviteDetails {
  email: string;
  used: boolean;
  expires_at: string;
}

export interface UserMetadata {
  first_name?: string;
  last_name?: string;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<SignInResult> {
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
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Get user admin status
 */
export async function getUserAdminStatus(userId: string): Promise<boolean> {
  const { data: adminStatus } = await supabase.rpc("get_user_admin_status", {
    user_id: userId,
  });
  return adminStatus === true;
}

/**
 * Request password reset email
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
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
 * Update user password
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
}

/**
 * Verify investor invite token
 */
export async function verifyInvestorInvite(
  inviteCode: string
): Promise<InviteDetails> {
  const { data, error } = await supabase
    .from("investor_invites" as any)
    .select("*")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Invalid invitation link");

  const inviteData = data as unknown as InviteDetails;

  if (inviteData.used) {
    throw new Error("This invitation has already been used");
  }

  const now = new Date();
  const expiryDate = new Date(inviteData.expires_at);
  if (now > expiryDate) {
    throw new Error("This invitation has expired");
  }

  return inviteData;
}

/**
 * Verify admin invite token
 */
export async function verifyAdminInvite(
  inviteCode: string
): Promise<InviteDetails> {
  const { data, error } = await supabase
    .from("admin_invites")
    .select("*")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Invalid invitation link");

  if (data.used) {
    throw new Error("This invitation has already been used");
  }

  const now = new Date();
  const expiryDate = new Date(data.expires_at);
  if (now > expiryDate) {
    throw new Error("This invitation has expired");
  }

  return {
    email: data.email,
    used: data.used ?? false,
    expires_at: data.expires_at,
  };
}

/**
 * Wait for profile to be created by database trigger
 */
export async function waitForProfile(
  userId: string,
  maxAttempts = 10
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (profile) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

/**
 * Accept investor invitation and create account
 */
export async function acceptInvestorInvite(
  inviteCode: string,
  email: string,
  password: string,
  metadata?: UserMetadata
): Promise<string> {
  // 1. Sign up the user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
      data: metadata,
    },
  });

  if (signUpError) throw signUpError;

  const userId = signUpData.user?.id;
  if (!userId) throw new Error("User ID not returned from signup");

  // 2. Mark invite as used
  const { error: updateError } = await supabase
    .from("investor_invites" as any)
    .update({ used: true, used_at: new Date().toISOString() })
    .eq("invite_code", inviteCode);

  if (updateError) throw updateError;

  // 3. Wait for profile to be created
  await waitForProfile(userId);

  // 4. Update profile with name
  if (metadata) {
    await supabase
      .from("profiles")
      .update({
        first_name: metadata.first_name,
        last_name: metadata.last_name,
      })
      .eq("id", userId);
  }

  return userId;
}

/**
 * Accept admin invitation and create account
 */
export async function acceptAdminInvite(
  inviteCode: string,
  email: string,
  password: string,
  metadata?: UserMetadata
): Promise<string> {
  // 1. Sign up the user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/admin`,
      data: metadata,
    },
  });

  if (signUpError) throw signUpError;

  const userId = signUpData.user?.id;
  if (!userId) throw new Error("User ID not returned from signup");

  // 2. Mark invite as used
  const { error: updateError } = await supabase
    .from("admin_invites")
    .update({ used: true })
    .eq("invite_code", inviteCode);

  if (updateError) throw updateError;

  // 3. Wait for profile to be created
  await waitForProfile(userId);

  // 4. Update profile with admin flag and name
  await supabase
    .from("profiles")
    .update({
      is_admin: true,
      first_name: metadata?.first_name,
      last_name: metadata?.last_name,
    })
    .eq("id", userId);

  // 5. Insert admin role
  await supabase.from("user_roles" as any).insert({
    user_id: userId,
    role: "admin",
  });

  return userId;
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
