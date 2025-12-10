import { supabase } from "@/integrations/supabase/client";

export class TOTPService {
  /**
   * Enrolls a user in TOTP MFA.
   * This method should be called to start the enrollment process.
   */
  static async enroll() {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data.id,
      secret: data.totp.secret,
      qrCode: data.totp.qr_code,
      uri: data.totp.uri,
    };
  }

  /**
   * Verifies a TOTP code during sign-in.
   * This method should be called after a user has enrolled and is signing in.
   */
  static async verify(code: string) {
    // First, get the list of factors to find the verified TOTP factor
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
   * Verifies the TOTP setup with a code.
   * This method should be called to complete the enrollment process.
   */
  static async verifySetup(factorId: string, code: string) {
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
   * Unenrolls a user from TOTP MFA.
   */
  static async unenroll(factorId: string) {
    const { error } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Gets the authentication assurance level for the current session.
   */
  static async getAuthenticatorAssuranceLevel() {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
}
