/**
 * Auth Module Types
 * Shared types for authentication operations
 */

import type { User, Session } from "@supabase/supabase-js";

// Core auth types
export interface SignInData {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface SignInResult {
  user: User;
  session: Session;
}

export interface AuthResponse<T = unknown> {
  data: T | null;
  error: Error | null;
  success: boolean;
}

// Invite types
export interface InviteDetails {
  email: string;
  used: boolean;
  expires_at: string;
}

export interface UserMetadata {
  first_name?: string;
  last_name?: string;
}

// MFA types
export interface TOTPEnrollment {
  id: string;
  secret: string;
  qrCode: string;
  uri: string;
}

export type TotpStatus = "disabled" | "pending" | "enabled";

export interface InitTotpResult {
  otpauth_url: string;
  secret_masked?: string;
}

// Profile type used in context
export interface AuthProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_admin: boolean;
  totp_enabled?: boolean;
  totp_verified?: boolean;
}
