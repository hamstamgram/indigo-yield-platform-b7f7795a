/**
 * Authentication Service
 * Handles all authentication operations
 */

import { ApiClient } from "./ApiClient";
import type { User, Session } from "@supabase/supabase-js";

export interface SignUpData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export class AuthService extends ApiClient {
  /**
   * Sign up a new user
   */
  async signUp(data: SignUpData) {
    const redirectUrl = `${window.location.origin}/`;

    const { data: authData, error } = await this.supabase.auth.signUp({
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
   * Sign in an existing user
   */
  async signIn(data: SignInData) {
    const { data: authData, error } = await this.supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    return { data: authData, error, success: !error };
  }

  /**
   * Sign out the current user
   */
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    return { error, success: !error };
  }

  /**
   * Get the current user
   */
  async getUser(): Promise<User | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    return user;
  }

  /**
   * Get the current session
   */
  async getCurrentSession(): Promise<Session | null> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    return session;
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string) {
    const { data, error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });

    return { data, error, success: !error };
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
    const {
      data: { subscription },
    } = this.supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null, session);
    });

    return () => subscription.unsubscribe();
  }

  /**
   * Reset password for email
   */
  async resetPasswordForEmail(email: string) {
    const redirectUrl = `${window.location.origin}/reset-password`;

    const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    return { data, error, success: !error };
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth(provider: "google", redirectTo?: string) {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo ?? `${window.location.origin}/dashboard` },
    });
    return { data, error, success: !error };
  }

  /**
   * Enroll MFA (TOTP)
   */
  async enrollMFA(factorType: "totp" = "totp") {
    const { data, error } = await this.supabase.auth.mfa.enroll({ factorType });
    return { data, error, success: !error };
  }

  /**
   * List MFA factors
   */
  async listMFAFactors() {
    const { data, error } = await this.supabase.auth.mfa.listFactors();
    return { data, error, success: !error };
  }

  /**
   * Verify MFA with challenge
   */
  async verifyMFA(factorId: string, code: string) {
    const { data, error } = await this.supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    return { data, error, success: !error };
  }

  /**
   * Verify OTP (for email verification)
   */
  async verifyOtp(tokenHash: string, type: "email" = "email") {
    const { data, error } = await this.supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    return { data, error, success: !error };
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string) {
    const { data, error } = await this.supabase.auth.resend({
      type: "signup",
      email,
    });
    return { data, error, success: !error };
  }
}

// Export singleton instance
export const authService = new AuthService();
