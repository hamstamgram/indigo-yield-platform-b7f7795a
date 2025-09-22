/**
 * TOTP Service Functions for Supabase
 * Handles 2FA setup, verification, and backup codes
 */

import { supabase } from '@/integrations/supabase/client';
import { TOTPSettings, BackupCode, TOTPVerificationResult, BackupCodeGenerationResult } from './totp';
import { TOTPUtils } from './totp';

export interface UserAccessLog {
  id: string;
  user_id: string;
  event_type: string;
  success: boolean;
  ip_address?: string;
  user_agent?: string;
  device_fingerprint?: string;
  totp_used: boolean;
  backup_code_used: boolean;
  failed_reason?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface TwoFactorPolicySettings {
  id: string;
  enforce_for_all_users: boolean;
  enforce_for_admins: boolean;
  grace_period_days: number;
  max_failed_attempts: number;
  lockout_duration_minutes: number;
  require_backup_codes: boolean;
  created_at: string;
  updated_at: string;
}

export class TOTPService {
  /**
   * Get user's TOTP settings
   */
  static async getTOTPSettings(userId: string): Promise<TOTPSettings | null> {
    try {
      const { data, error } = await supabase
        .from('user_totp_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error fetching TOTP settings:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to get TOTP settings:', error);
      throw error;
    }
  }

  /**
   * Initialize TOTP setup for a user
   */
  static async initializeTOTPSetup(userId: string): Promise<{ secret: string; settings: TOTPSettings }> {
    try {
      const secret = TOTPUtils.generateSecret();
      
      // Call the database function to create TOTP settings with encrypted secret
      const { data, error } = await supabase
        .rpc('initialize_user_totp', {
          p_user_id: userId,
          p_secret: secret,
          p_algorithm: 'SHA1',
          p_digits: 6,
          p_period: 30
        });

      if (error) {
        console.error('Error initializing TOTP:', error);
        throw error;
      }

      // Fetch the created settings
      const settings = await this.getTOTPSettings(userId);
      if (!settings) {
        throw new Error('Failed to create TOTP settings');
      }

      return { secret, settings };
    } catch (error) {
      console.error('Failed to initialize TOTP setup:', error);
      throw error;
    }
  }

  /**
   * Complete TOTP setup after verification
   */
  static async completeTOTPSetup(userId: string, verificationCode: string): Promise<BackupCodeGenerationResult> {
    try {
      // Call the database function to verify and complete setup
      const { data, error } = await supabase
        .rpc('complete_totp_setup', {
          p_user_id: userId,
          p_verification_code: verificationCode
        });

      if (error) {
        console.error('Error completing TOTP setup:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'TOTP verification failed');
      }

      // Generate backup codes
      const backupCodes = TOTPUtils.generateBackupCodes(10, 8);
      const batchId = crypto.randomUUID();

      // Hash codes for storage
      const hashedCodes = await Promise.all(
        backupCodes.map(code => TOTPUtils.hashBackupCode(code))
      );

      // Store backup codes in database
      const backupCodeInserts = hashedCodes.map(hashedCode => ({
        user_id: userId,
        totp_settings_id: data.totp_settings_id,
        code_hash: hashedCode,
        generated_batch_id: batchId
      }));

      const { error: backupError } = await supabase
        .from('user_backup_codes')
        .insert(backupCodeInserts);

      if (backupError) {
        console.error('Error storing backup codes:', backupError);
        throw backupError;
      }

      return {
        codes: backupCodes, // Return plain text codes (only time they're shown)
        batch_id: batchId,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to complete TOTP setup:', error);
      throw error;
    }
  }

  /**
   * Verify TOTP code during login
   */
  static async verifyTOTPCode(userId: string, code: string, isBackupCode = false): Promise<TOTPVerificationResult> {
    try {
      const functionName = isBackupCode ? 'verify_backup_code' : 'verify_totp_code';
      const { data, error } = await supabase
        .rpc(functionName, {
          p_user_id: userId,
          p_code: code
        });

      if (error) {
        console.error(`Error verifying ${isBackupCode ? 'backup' : 'TOTP'} code:`, error);
        throw error;
      }

      // Log the access attempt
      await this.logAccessAttempt(userId, 'totp_verification', data.success, {
        totp_used: !isBackupCode,
        backup_code_used: isBackupCode,
        failed_reason: data.success ? undefined : data.error
      });

      return {
        success: data.success,
        remaining_attempts: data.remaining_attempts,
        locked_until: data.locked_until,
        backup_code_used: isBackupCode,
        error: data.error
      };
    } catch (error) {
      console.error('Failed to verify TOTP code:', error);
      
      // Log failed verification attempt
      await this.logAccessAttempt(userId, 'totp_verification', false, {
        totp_used: !isBackupCode,
        backup_code_used: isBackupCode,
        failed_reason: error.message
      });

      throw error;
    }
  }

  /**
   * Disable TOTP for a user
   */
  static async disableTOTP(userId: string, adminUserId?: string): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('disable_user_totp', {
          p_user_id: userId,
          p_admin_user_id: adminUserId
        });

      if (error) {
        console.error('Error disabling TOTP:', error);
        throw error;
      }

      // Log the action
      await this.logAccessAttempt(userId, 'totp_disabled', true, {
        disabled_by_admin: !!adminUserId,
        admin_user_id: adminUserId
      });
    } catch (error) {
      console.error('Failed to disable TOTP:', error);
      throw error;
    }
  }

  /**
   * Generate new backup codes (invalidates old ones)
   */
  static async regenerateBackupCodes(userId: string): Promise<BackupCodeGenerationResult> {
    try {
      // Get user's TOTP settings
      const settings = await this.getTOTPSettings(userId);
      if (!settings) {
        throw new Error('TOTP not set up for user');
      }

      // Generate new backup codes
      const backupCodes = TOTPUtils.generateBackupCodes(10, 8);
      const batchId = crypto.randomUUID();

      // Hash codes for storage
      const hashedCodes = await Promise.all(
        backupCodes.map(code => TOTPUtils.hashBackupCode(code))
      );

      // Invalidate old backup codes and insert new ones
      const { error } = await supabase
        .rpc('regenerate_backup_codes', {
          p_user_id: userId,
          p_totp_settings_id: settings.id,
          p_new_codes: hashedCodes,
          p_batch_id: batchId
        });

      if (error) {
        console.error('Error regenerating backup codes:', error);
        throw error;
      }

      // Log the action
      await this.logAccessAttempt(userId, 'backup_codes_regenerated', true, {
        batch_id: batchId,
        codes_count: backupCodes.length
      });

      return {
        codes: backupCodes,
        batch_id: batchId,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to regenerate backup codes:', error);
      throw error;
    }
  }

  /**
   * Get user's backup codes (without revealing codes)
   */
  static async getBackupCodes(userId: string): Promise<BackupCode[]> {
    try {
      const { data, error } = await supabase
        .from('user_backup_codes')
        .select('id, user_id, totp_settings_id, used_at, created_at, generated_batch_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching backup codes:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get backup codes:', error);
      throw error;
    }
  }

  /**
   * Check if 2FA is required for a user
   */
  static async isTwoFactorRequired(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('is_2fa_required', {
          p_user_id: userId
        });

      if (error) {
        console.error('Error checking 2FA requirement:', error);
        throw error;
      }

      return data || false;
    } catch (error) {
      console.error('Failed to check 2FA requirement:', error);
      return false; // Default to not required on error
    }
  }

  /**
   * Get 2FA policy settings
   */
  static async getTwoFactorPolicy(): Promise<TwoFactorPolicySettings | null> {
    try {
      const { data, error } = await supabase
        .from('two_factor_policy')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching 2FA policy:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to get 2FA policy:', error);
      throw error;
    }
  }

  /**
   * Update 2FA policy settings (admin only)
   */
  static async updateTwoFactorPolicy(policy: Partial<TwoFactorPolicySettings>): Promise<TwoFactorPolicySettings> {
    try {
      const { data, error } = await supabase
        .from('two_factor_policy')
        .upsert({
          id: policy.id || '1', // Single row table
          ...policy,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating 2FA policy:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to update 2FA policy:', error);
      throw error;
    }
  }

  /**
   * Log user access attempt
   */
  static async logAccessAttempt(
    userId: string,
    eventType: string,
    success: boolean,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const deviceFingerprint = TOTPUtils.getDeviceFingerprint();
      const userAgent = navigator.userAgent;
      
      // Get IP address (best effort client-side)
      let ipAddress: string;
      try {
        ipAddress = await TOTPUtils.getClientIP();
      } catch {
        ipAddress = 'unknown';
      }

      const { error } = await supabase
        .from('user_access_logs')
        .insert({
          user_id: userId,
          event_type: eventType,
          success,
          ip_address: ipAddress,
          user_agent: userAgent,
          device_fingerprint: deviceFingerprint,
          totp_used: metadata.totp_used || false,
          backup_code_used: metadata.backup_code_used || false,
          failed_reason: metadata.failed_reason,
          metadata
        });

      if (error) {
        console.error('Error logging access attempt:', error);
        // Don't throw - logging failure shouldn't break the main flow
      }
    } catch (error) {
      console.error('Failed to log access attempt:', error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Get user access logs
   */
  static async getUserAccessLogs(userId: string, limit = 50, offset = 0): Promise<UserAccessLog[]> {
    try {
      const { data, error } = await supabase
        .from('user_access_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching access logs:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get access logs:', error);
      throw error;
    }
  }

  /**
   * Get all access logs (admin only)
   */
  static async getAllAccessLogs(limit = 100, offset = 0, filters?: {
    userId?: string;
    eventType?: string;
    success?: boolean;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<UserAccessLog[]> {
    try {
      let query = supabase
        .from('user_access_logs')
        .select(`
          *,
          profiles!user_access_logs_user_id_fkey(
            email,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.eventType) {
        query = query.eq('event_type', filters.eventType);
      }
      if (filters?.success !== undefined) {
        query = query.eq('success', filters.success);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching all access logs:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get all access logs:', error);
      throw error;
    }
  }
}
