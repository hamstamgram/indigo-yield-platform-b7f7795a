/**
 * Multi-Factor Authentication Manager
 * Implements TOTP-based 2FA with backup codes
 */

import { supabase } from "@/integrations/supabase/client";
import { securityLogger, SecurityEventType, SecuritySeverity } from "./security-logger";
import * as OTPAuth from "otpauth";

interface MFASetupData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

interface MFAVerificationResult {
  success: boolean;
  error?: string;
  requiresBackupCode?: boolean;
}

class MFAManager {
  private static instance: MFAManager;
  private readonly APP_NAME = "Indigo Yield Platform";
  private readonly BACKUP_CODE_LENGTH = 8;
  private readonly BACKUP_CODE_COUNT = 10;

  private constructor() {}

  public static getInstance(): MFAManager {
    if (!MFAManager.instance) {
      MFAManager.instance = new MFAManager();
    }
    return MFAManager.instance;
  }

  /**
   * Generate TOTP secret for user
   */
  public generateSecret(): string {
    const array = new Uint8Array(20);
    crypto.getRandomValues(array);
    return this.base32Encode(array);
  }

  /**
   * Base32 encoding for TOTP secret
   */
  private base32Encode(buffer: Uint8Array): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let result = "";
    let bits = 0;
    let value = 0;

    for (const byte of Array.from(buffer)) {
      value = (value << 8) | byte;
      bits += 8;

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }

    return result;
  }

  /**
   * Generate QR code for TOTP setup
   */
  public async generateQRCode(email: string, secret: string): Promise<string> {
    try {
      // Create TOTP instance
      const totp = new OTPAuth.TOTP({
        issuer: this.APP_NAME,
        label: email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: secret,
      });

      // Generate provisioning URI
      const uri = totp.toString();

      // Generate QR code using a service (in production, use server-side generation)
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(uri)}`;

      return qrCodeUrl;
    } catch (error) {
      console.error("QR code generation failed:", error);
      throw new Error("Failed to generate QR code");
    }
  }

  /**
   * Generate backup codes
   */
  public generateBackupCodes(): string[] {
    const codes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      const array = new Uint8Array(this.BACKUP_CODE_LENGTH / 2);
      crypto.getRandomValues(array);
      const code = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
      codes.push(code.toUpperCase());
    }

    return codes;
  }

  /**
   * Setup MFA for user
   */
  public async setupMFA(email: string): Promise<MFASetupData> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Generate secret and backup codes
      const secret = this.generateSecret();
      const backupCodes = this.generateBackupCodes();
      const qrCode = await this.generateQRCode(email, secret);

      // Hash backup codes for storage
      const hashedBackupCodes = await Promise.all(
        backupCodes.map((code) => this.hashBackupCode(code))
      );

      // Store MFA settings (encrypted secret stored server-side in production)
      const { error } = await supabase.from("user_totp_settings").upsert({
        user_id: user.id,
        enabled: false, // Will be enabled after verification
        mfa_method: "TOTP",
        backup_codes: hashedBackupCodes,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      // Store encrypted secret in secure storage (server-side in production)
      await this.storeEncryptedSecret(user.id, secret);

      // Log MFA setup attempt
      await securityLogger.logEvent(SecurityEventType.MFA_ENABLED, SecuritySeverity.MEDIUM, {
        method: "TOTP",
      });

      return {
        secret,
        qrCode,
        backupCodes,
      };
    } catch (error) {
      console.error("MFA setup failed:", error);
      throw new Error("Failed to setup MFA");
    }
  }

  /**
   * Store encrypted TOTP secret
   * SECURITY: This feature is currently disabled for security reasons.
   * Client-side storage (sessionStorage) is vulnerable to XSS attacks.
   * TODO: Implement server-side secret storage via Supabase Edge Function
   */
  private async storeEncryptedSecret(_userId: string, _secret: string): Promise<void> {
    // SECURITY: Client-side storage of TOTP secrets is insecure
    // This must be stored server-side with proper encryption (AES-256-GCM)
    // Using Supabase vault or encrypted column in user_totp_settings table

    console.warn(
      "[MFA] SECURITY: Client-side TOTP secret storage is disabled. Implement server-side storage."
    );

    // Do NOT store secrets in sessionStorage - vulnerable to XSS
    // The secret will need to be re-generated when server-side storage is implemented
    throw new Error("MFA setup requires server-side implementation. Please contact support.");
  }

  /**
   * Verify TOTP code
   * SECURITY: Currently disabled until server-side secret storage is implemented
   */
  public async verifyTOTP(_code: string): Promise<MFAVerificationResult> {
    // SECURITY: TOTP verification requires server-side secret storage
    // Client-side verification with sessionStorage is vulnerable to XSS
    // TODO: Implement verification via Supabase Edge Function that:
    // 1. Retrieves encrypted secret from secure server-side storage
    // 2. Decrypts and verifies the TOTP code server-side
    // 3. Returns only success/failure to client

    console.warn(
      "[MFA] SECURITY: TOTP verification is disabled until server-side implementation is complete."
    );

    return {
      success: false,
      error: "Two-factor authentication is not yet available. Server-side implementation required.",
    };
  }

  /**
   * Decrypt TOTP secret (should be server-side in production)
   */
  private async decryptSecret(userId: string, encryptedData: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      // Convert from base64
      const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      // Recreate encryption key
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(userId),
        "PBKDF2",
        false,
        ["deriveBits", "deriveKey"]
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: encoder.encode("mfa-secret-salt"),
          iterations: 100000,
          hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );

      // Decrypt
      const decryptedData = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);

      return decoder.decode(decryptedData);
    } catch (error) {
      console.error("Failed to decrypt secret:", error);
      throw error;
    }
  }

  /**
   * Hash backup code for storage
   */
  private async hashBackupCode(code: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Verify backup code
   */
  public async verifyBackupCode(code: string): Promise<MFAVerificationResult> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Hash the provided code
      const hashedCode = await this.hashBackupCode(code.toUpperCase());

      // Get user's backup codes
      const { data: mfaSettings, error } = await supabase
        .from("user_totp_settings")
        .select("backup_codes")
        .eq("user_id", user.id)
        .single();

      if (error || !mfaSettings) {
        return { success: false, error: "MFA not configured" };
      }

      // Check if code matches
      const backupCodes = (mfaSettings as any).backup_codes as string[];
      const codeIndex = backupCodes.indexOf(hashedCode);

      if (codeIndex === -1) {
        await securityLogger.logEvent(SecurityEventType.MFA_CHALLENGE, SecuritySeverity.MEDIUM, {
          success: false,
          type: "backup_code",
        });
        return { success: false, error: "Invalid backup code" };
      }

      // Remove used backup code
      backupCodes.splice(codeIndex, 1);

      // Update backup codes
      await supabase
        .from("user_totp_settings")
        .update({ backup_codes: backupCodes } as any)
        .eq("user_id", user.id);

      // Log successful verification
      await securityLogger.logEvent(SecurityEventType.MFA_CHALLENGE, SecuritySeverity.LOW, {
        success: true,
        type: "backup_code",
      });

      return { success: true };
    } catch (error) {
      console.error("Backup code verification failed:", error);
      return { success: false, error: "Verification failed" };
    }
  }

  /**
   * Enable MFA after successful verification
   */
  public async enableMFA(): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      await supabase.from("user_totp_settings").update({ enabled: true }).eq("user_id", user.id);

      await securityLogger.logEvent(SecurityEventType.MFA_ENABLED, SecuritySeverity.MEDIUM);
    } catch (error) {
      console.error("Failed to enable MFA:", error);
      throw error;
    }
  }

  /**
   * Disable MFA
   */
  public async disableMFA(): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      await supabase.from("user_totp_settings").update({ enabled: false }).eq("user_id", user.id);

      // Note: Server-side secret cleanup would happen via Edge Function
      // No client-side storage to clear when using proper server-side implementation

      await securityLogger.logEvent(SecurityEventType.MFA_DISABLED, SecuritySeverity.HIGH);
    } catch (error) {
      console.error("Failed to disable MFA:", error);
      throw error;
    }
  }

  /**
   * Check if user has MFA enabled
   */
  public async isMFAEnabled(): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return false;
      }

      const { data, error } = await supabase
        .from("user_totp_settings")
        .select("enabled")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        return false;
      }

      return data.enabled === true;
    } catch (error) {
      console.error("Failed to check MFA status:", error);
      return false;
    }
  }
}

// Export singleton instance
export const mfaManager = MFAManager.getInstance();
