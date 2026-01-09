/**
 * MFA Service
 * Consolidated multi-factor authentication operations
 * Supports both Supabase native MFA and custom edge function TOTP
 */

import { supabase } from "@/integrations/supabase/client";
import type { TOTPEnrollment, TotpStatus, InitTotpResult, AuthResponse } from "./types";

// ============================================================================
// Supabase Native MFA (TOTP)
// ============================================================================

/**
 * Enrolls a user in TOTP MFA
 */
export async function enrollMFA(): Promise<AuthResponse<TOTPEnrollment>> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
  });

  if (error) {
    return { data: null, error, success: false };
  }

  return {
    data: {
      id: data.id,
      secret: data.totp.secret,
      qrCode: data.totp.qr_code,
      uri: data.totp.uri,
    },
    error: null,
    success: true,
  };
}

/**
 * List all MFA factors for the current user
 */
export async function listMFAFactors(): Promise<AuthResponse<{ all: any[]; totp: any[] }>> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  return { data, error, success: !error };
}

/**
 * Verify MFA with challenge
 */
export async function verifyMFA(
  factorId: string,
  code: string
): Promise<AuthResponse<any>> {
  const { data, error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });
  return { data, error, success: !error };
}

/**
 * Verifies a TOTP code during sign-in
 */
export async function verifyTOTPSignIn(code: string): Promise<any> {
  // Get the list of factors to find the verified TOTP factor
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) {
    throw new Error(listError.message);
  }

  const totpFactor = factors.all.find(
    (f) => f.factor_type === "totp" && f.status === "verified"
  );

  if (!totpFactor) {
    throw new Error("No verified TOTP factor found for this user.");
  }

  // Challenge the factor
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: totpFactor.id,
  });

  if (challengeError) {
    throw new Error(challengeError.message);
  }

  // Verify the code against the challenge
  const { data, error } = await supabase.auth.mfa.verify({
    factorId: totpFactor.id,
    challengeId: challenge.id,
    code,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Verifies the TOTP setup with a code (completes enrollment)
 */
export async function verifyTOTPSetup(factorId: string, code: string): Promise<any> {
  const { data, error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Unenrolls a user from TOTP MFA
 */
export async function unenrollMFA(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({
    factorId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Gets the authentication assurance level for the current session
 */
export async function getAuthenticatorAssuranceLevel(): Promise<any> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

// ============================================================================
// Edge Function Based TOTP (Custom Implementation)
// ============================================================================

async function callMfaFunction<T>(functionName: string, body?: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (error) {
    throw new Error(error.message || "MFA function call failed");
  }

  return data;
}

/**
 * Get TOTP status from edge function
 */
export async function getTotpStatus(): Promise<{ status: TotpStatus }> {
  try {
    return await callMfaFunction("mfa-totp-status");
  } catch {
    return { status: "disabled" };
  }
}

/**
 * Initialize TOTP via edge function
 */
export async function initTotp(): Promise<InitTotpResult> {
  return await callMfaFunction("mfa-totp-initiate", {});
}

/**
 * Verify TOTP via edge function
 */
export async function verifyTotp(code: string): Promise<{ enabled: boolean }> {
  return await callMfaFunction("mfa-totp-verify", { code });
}

/**
 * Disable TOTP via edge function
 */
export async function disableTotp(code: string): Promise<{ disabled: boolean }> {
  return await callMfaFunction("mfa-totp-disable", { code });
}

// ============================================================================
// Legacy Class Export (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use individual function exports instead
 */
export class TOTPService {
  static async enroll() {
    const result = await enrollMFA();
    if (!result.success || !result.data) {
      throw new Error(result.error?.message || "Failed to enroll MFA");
    }
    return result.data;
  }

  static async verify(code: string) {
    return verifyTOTPSignIn(code);
  }

  static async verifySetup(factorId: string, code: string) {
    return verifyTOTPSetup(factorId, code);
  }

  static async unenroll(factorId: string) {
    return unenrollMFA(factorId);
  }

  static async getAuthenticatorAssuranceLevel() {
    return getAuthenticatorAssuranceLevel();
  }
}
