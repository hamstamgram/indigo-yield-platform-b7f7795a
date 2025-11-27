import { useState } from "react";
import QRCode from "qrcode";

/**
 * TOTP (Time-Based One-Time Password) Utilities
 * For 2FA implementation with QR codes and backup codes
 */

export interface TOTPConfig {
  secret: string;
  algorithm: "SHA1" | "SHA256" | "SHA512";
  digits: 6 | 8;
  period: number;
  issuer: string;
  accountName: string;
}

export interface TOTPSettings {
  id: string;
  user_id: string;
  enabled: boolean;
  algorithm: string;
  digits: number;
  period: number;
  verified_at?: string;
  setup_completed_at?: string;
  qr_code_shown_at?: string;
  backup_codes_generated_at?: string;
  recovery_used_count: number;
  enforce_required: boolean;
  last_used_at?: string;
  failed_attempts: number;
  locked_until?: string;
  created_at: string;
  updated_at: string;
}

export interface BackupCode {
  id: string;
  user_id: string;
  totp_settings_id: string;
  used_at?: string;
  created_at: string;
  generated_batch_id: string;
}

export interface TOTPVerificationResult {
  success: boolean;
  remaining_attempts?: number;
  locked_until?: string;
  backup_code_used?: boolean;
  error?: string;
}

export interface BackupCodeGenerationResult {
  success: boolean;
  codes: string[];
}

export class TOTPUtils {
  private static readonly ISSUER = "Indigo Yield Platform";
  private static readonly BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

  /**
   * Generate a random TOTP secret
   */
  static generateSecret(length: number = 32): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);

    let secret = "";
    for (let i = 0; i < bytes.length; i++) {
      secret += this.BASE32_CHARS[bytes[i] % 32];
    }

    return secret;
  }

  /**
   * Generate TOTP URL for QR code
   */
  static generateTOTPUrl(config: TOTPConfig): string {
    const params = new URLSearchParams({
      secret: config.secret,
      issuer: config.issuer,
      algorithm: config.algorithm,
      digits: config.digits.toString(),
      period: config.period.toString(),
    });

    return `otpauth://totp/${encodeURIComponent(config.issuer)}:${encodeURIComponent(config.accountName)}?${params.toString()}`;
  }

  /**
   * Generate QR code data URL for TOTP setup
   */
  static async generateQRCode(totpUrl: string): Promise<string> {
    // Render locally to avoid leaking secrets to third-party QR services
    try {
      return await QRCode.toDataURL(totpUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 256,
      });
    } catch (error) {
      console.error("Failed to generate QR code locally:", error);
      return `data:text/plain;charset=utf-8,${encodeURIComponent(totpUrl)}`;
    }
  }

  /**
   * Verify TOTP code
   * This would typically be done server-side for security
   */
  static async verifyTOTP(
    secret: string,
    token: string,
    config: Partial<TOTPConfig> = {}
  ): Promise<boolean> {
    const { algorithm = "SHA1", digits = 6, period = 30 } = config;

    try {
      // This is a simplified verification - in production, this should be done server-side
      // Using Web Crypto API for HMAC
      const key = await this.base32ToBytes(secret);
      const timeStep = Math.floor(Date.now() / 1000 / period);

      // Check current time step and adjacent ones for clock skew
      for (let i = -1; i <= 1; i++) {
        const testTimeStep = timeStep + i;
        const expectedToken = await this.generateTOTPToken(key, testTimeStep, algorithm, digits);

        if (expectedToken === token) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("TOTP verification failed:", error);
      return false;
    }
  }

  /**
   * Generate backup codes
   */
  static generateBackupCodes(count: number = 10, length: number = 8): string[] {
    const codes: string[] = [];
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    for (let i = 0; i < count; i++) {
      let code = "";
      for (let j = 0; j < length; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Format code with hyphens for readability (e.g., ABCD-EFGH)
      if (length === 8) {
        code = code.substring(0, 4) + "-" + code.substring(4);
      }

      codes.push(code);
    }

    return codes;
  }

  /**
   * Validate backup code format
   */
  static validateBackupCode(code: string): boolean {
    // Remove hyphens and check format
    const cleanCode = code.replace(/-/g, "").toUpperCase();
    return /^[A-Z0-9]{8}$/.test(cleanCode);
  }

  /**
   * Hash backup code for secure storage
   */
  static async hashBackupCode(code: string): Promise<string> {
    const cleanCode = code.replace(/-/g, "").toUpperCase();
    const encoder = new TextEncoder();
    const data = encoder.encode(cleanCode + "BACKUP_CODE_SALT");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Format backup codes for display
   */
  static formatBackupCodesForDisplay(codes: string[]): string[] {
    return codes.map((code) => {
      const cleanCode = code.replace(/-/g, "");
      return cleanCode.substring(0, 4) + "-" + cleanCode.substring(4);
    });
  }

  // Private helper methods

  private static async base32ToBytes(base32: string): Promise<Uint8Array> {
    const cleanBase32 = base32.replace(/[^A-Z2-7]/g, "").toUpperCase();
    const bytes = new Uint8Array(Math.floor((cleanBase32.length * 5) / 8));
    let bitBuffer = 0;
    let bitCount = 0;
    let byteIndex = 0;

    for (const char of cleanBase32) {
      const value = this.BASE32_CHARS.indexOf(char);
      if (value === -1) continue;

      bitBuffer = (bitBuffer << 5) | value;
      bitCount += 5;

      if (bitCount >= 8) {
        bytes[byteIndex++] = (bitBuffer >> (bitCount - 8)) & 0xff;
        bitCount -= 8;
      }
    }

    return bytes;
  }

  private static async generateTOTPToken(
    secret: Uint8Array,
    timeStep: number,
    algorithm: string,
    digits: number
  ): Promise<string> {
    // Convert time step to 8-byte big-endian
    const timeBytes = new ArrayBuffer(8);
    const timeView = new DataView(timeBytes);
    timeView.setUint32(4, timeStep, false);

    // Import secret as HMAC key
    const secretBuffer =
      secret.buffer instanceof ArrayBuffer ? secret.buffer : new ArrayBuffer(secret.byteLength);
    const key = await crypto.subtle.importKey(
      "raw",
      secretBuffer,
      { name: "HMAC", hash: `SHA-${algorithm.substring(3)}` },
      false,
      ["sign"]
    );

    // Generate HMAC
    const signature = await crypto.subtle.sign("HMAC", key, timeBytes);
    const hashBytes = new Uint8Array(signature);

    // Dynamic truncation
    const offset = hashBytes[hashBytes.length - 1] & 0x0f;
    const truncatedHash =
      ((hashBytes[offset] & 0x7f) << 24) |
      ((hashBytes[offset + 1] & 0xff) << 16) |
      ((hashBytes[offset + 2] & 0xff) << 8) |
      (hashBytes[offset + 3] & 0xff);

    // Generate token
    const token = (truncatedHash % Math.pow(10, digits)).toString();
    return token.padStart(digits, "0");
  }

  /**
   * Get device fingerprint for access logging
   */
  static getDeviceFingerprint(): string {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx?.fillText("Device fingerprint", 10, 10);

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
    ].join("|");

    return btoa(fingerprint).substring(0, 32);
  }

  /**
   * Get client IP address (best effort)
   */
  static async getClientIP(): Promise<string> {
    // Avoid client-side IP lookups; collect IP server-side instead
    return "unknown";
  }
}

/**
 * React hook for TOTP management
 */
export function useTOTP() {
  const [error, setError] = useState<string | null>(null);

  const generateSecret = () => {
    return TOTPUtils.generateSecret();
  };

  const generateQRCode = async (userEmail: string, secret: string) => {
    const config: TOTPConfig = {
      secret,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      issuer: TOTPUtils["ISSUER"],
      accountName: userEmail,
    };

    const totpUrl = TOTPUtils.generateTOTPUrl(config);
    return await TOTPUtils.generateQRCode(totpUrl);
  };

  const verifyTOTP = async (secret: string, token: string) => {
    return await TOTPUtils.verifyTOTP(secret, token);
  };

  const generateBackupCodes = (count?: number, length?: number) => {
    return TOTPUtils.generateBackupCodes(count, length);
  };

  const clearError = () => setError(null);

  return {
    generateSecret,
    generateQRCode,
    verifyTOTP,
    generateBackupCodes,
    error,
    clearError,
  };
}
