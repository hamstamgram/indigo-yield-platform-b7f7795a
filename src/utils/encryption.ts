/**
 * Field-Level Encryption for PII Data
 * Uses Web Crypto API for client-side encryption of sensitive data
 */

import { supabase } from '@/integrations/supabase/client';

class FieldEncryption {
  private static instance: FieldEncryption;
  private encryptionKey: CryptoKey | null = null;
  private readonly algorithm = 'AES-GCM';
  private readonly keyLength = 256;

  private constructor() {}

  public static getInstance(): FieldEncryption {
    if (!FieldEncryption.instance) {
      FieldEncryption.instance = new FieldEncryption();
    }
    return FieldEncryption.instance;
  }

  /**
   * Initialize encryption key from user's session
   */
  public async initialize(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Derive key from user ID and session
      const keyMaterial = await this.getKeyMaterial(user.id);
      this.encryptionKey = await this.deriveKey(keyMaterial);
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw error;
    }
  }

  /**
   * Get key material from user ID
   */
  private async getKeyMaterial(userId: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(userId);

    return window.crypto.subtle.importKey(
      'raw',
      keyData,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
  }

  /**
   * Derive encryption key from key material
   */
  private async deriveKey(keyMaterial: CryptoKey): Promise<CryptoKey> {
    const salt = new TextEncoder().encode('indigo-yield-platform-salt-v1');

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.algorithm, length: this.keyLength },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt sensitive data
   */
  public async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      await this.initialize();
    }

    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      // Generate random IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encrypt data
      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv
        },
        this.encryptionKey,
        dataBuffer
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...Array.from(combined)));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  public async decrypt(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      await this.initialize();
    }

    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    try {
      // Convert from base64
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      // Decrypt data
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv
        },
        this.encryptionKey,
        data
      );

      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt PII fields in an object
   */
  public async encryptPIIFields<T extends Record<string, any>>(
    data: T,
    fieldsToEncrypt: (keyof T)[]
  ): Promise<T> {
    const encryptedData = { ...data };

    for (const field of fieldsToEncrypt) {
      if (data[field] && typeof data[field] === 'string') {
        try {
          encryptedData[field] = await this.encrypt(data[field] as string) as T[keyof T];
        } catch (error) {
          console.error(`Failed to encrypt field ${String(field)}:`, error);
          // Don't block operation if encryption fails for a field
        }
      }
    }

    return encryptedData;
  }

  /**
   * Decrypt PII fields in an object
   */
  public async decryptPIIFields<T extends Record<string, any>>(
    data: T,
    fieldsToDecrypt: (keyof T)[]
  ): Promise<T> {
    const decryptedData = { ...data };

    for (const field of fieldsToDecrypt) {
      if (data[field] && typeof data[field] === 'string') {
        try {
          decryptedData[field] = await this.decrypt(data[field] as string) as T[keyof T];
        } catch (error) {
          console.error(`Failed to decrypt field ${String(field)}:`, error);
          // Return encrypted value if decryption fails
        }
      }
    }

    return decryptedData;
  }

  /**
   * Hash sensitive data for comparison (one-way)
   */
  public async hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  }

  /**
   * Mask sensitive data for display
   */
  public maskData(data: string, visibleChars = 4): string {
    if (!data || data.length <= visibleChars) {
      return data;
    }

    const maskLength = Math.max(data.length - visibleChars, 0);
    const masked = '*'.repeat(maskLength) + data.slice(-visibleChars);
    return masked;
  }

  /**
   * Mask email address
   */
  public maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!domain) return email;

    const maskedLocal = this.maskData(localPart, 2);
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Mask phone number
   */
  public maskPhone(phone: string): string {
    // Remove non-digits
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return phone;

    // Show only last 4 digits
    return `***-***-${digits.slice(-4)}`;
  }

  /**
   * Mask account number
   */
  public maskAccountNumber(accountNumber: string): string {
    return this.maskData(accountNumber, 4);
  }

  /**
   * Clear encryption key (on logout)
   */
  public clearKey(): void {
    this.encryptionKey = null;
  }
}

// Export singleton instance
export const fieldEncryption = FieldEncryption.getInstance();

// PII fields configuration
export const PII_FIELDS = {
  profiles: ['phone_number', 'date_of_birth', 'ssn_last4'],
  investor_profiles: ['tax_id', 'bank_account', 'bank_routing'],
  transactions: ['bank_reference', 'wire_reference'],
  support_tickets: ['contact_phone', 'contact_email'],
} as const;

// Helper hooks for React components
import { useEffect, useState } from 'react';

export function useEncryptedField(value: string | null | undefined): {
  decrypted: string | null;
  loading: boolean;
  error: Error | null;
} {
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!value) {
      setDecrypted(null);
      setLoading(false);
      return;
    }

    fieldEncryption.decrypt(value)
      .then(setDecrypted)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [value]);

  return { decrypted, loading, error };
}

export function useMaskedField(value: string | null | undefined, type: 'email' | 'phone' | 'account' = 'account'): string {
  if (!value) return '';

  switch (type) {
    case 'email':
      return fieldEncryption.maskEmail(value);
    case 'phone':
      return fieldEncryption.maskPhone(value);
    case 'account':
    default:
      return fieldEncryption.maskAccountNumber(value);
  }
}