import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

/**
 * Generate a new TOTP secret for a user
 */
export function generateTOTPSecret(userEmail: string, issuer: string = 'Indigo Yield Platform') {
  const secret = speakeasy.generateSecret({
    name: `${issuer} (${userEmail})`,
    issuer: issuer,
    length: 32,
  });

  return {
    secret: secret.base32,
    otpauth_url: secret.otpauth_url,
  };
}

/**
 * Generate QR code for TOTP setup
 */
export async function generateQRCode(otpauth_url: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth_url);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify a TOTP token
 */
export function verifyTOTPToken(token: string, secret: string): boolean {
  try {
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2, // Allow 2 time steps before/after for clock skew
    });
    
    return verified;
  } catch (error) {
    console.error('Error verifying TOTP token:', error);
    return false;
  }
}

/**
 * Generate backup codes for account recovery
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  
  return codes;
}

/**
 * Format backup codes for display
 */
export function formatBackupCodes(codes: string[]): string {
  return codes.map((code, index) => 
    `${(index + 1).toString().padStart(2, '0')}. ${code}`
  ).join('\n');
}

/**
 * Validate TOTP token format
 */
export function isValidTOTPToken(token: string): boolean {
  // TOTP tokens are typically 6 digits
  return /^\d{6}$/.test(token);
}

/**
 * Generate a recovery token for account recovery
 */
export function generateRecoveryToken(): string {
  return speakeasy.generateSecret({ length: 32 }).base32;
}
