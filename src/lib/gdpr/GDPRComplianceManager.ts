/**
 * GDPR Compliance Manager
 * Implements data privacy rights and consent management
 */

import { supabase } from '@/integrations/supabase/client';
import { securityLogger } from '@/utils/security-logger';
import { fieldEncryption } from '@/utils/encryption';
import { Database } from '@/integrations/supabase/types';
import { PostgrestError } from '@supabase/supabase-js';
import {
  ConsentType,
  DataRequestType,
  DataRequestStatus,
  ConsentRecord,
  DataRequest,
} from './types';

// Type definitions for GDPR tables (not in generated types yet)
interface GDPRConsentRow {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  consented: boolean;
  consent_date?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

interface GDPRDataRequestRow {
  id: string;
  user_id: string;
  request_type: DataRequestType;
  status: DataRequestStatus;
  requested_at: string;
  completed_at?: string;
  export_url?: string;
  notes?: string;
}

// Supabase query result types
type SupabaseQueryResult<T> = {
  data: T | null;
  error: PostgrestError | null;
};

// Database table row types from generated types
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type TransactionV2Row = Database['public']['Tables']['transactions_v2']['Row'];
type AuditLogRow = Database['public']['Tables']['audit_log']['Row'];

// User export data structure
interface UserExportData {
  export_date: string;
  user_id: string;
  profile?: Partial<ProfileRow>;
  investor_profile?: Record<string, unknown>;
  transactions: TransactionV2Row[];
  monthly_statements: unknown[];
  audit_logs: AuditLogRow[];
  consent_records: GDPRConsentRow[];
}

class GDPRComplianceManager {
  private static instance: GDPRComplianceManager;
  private userConsents: Map<ConsentType, boolean> = new Map();

  private constructor() {
    this.loadUserConsents();
  }

  public static getInstance(): GDPRComplianceManager {
    if (!GDPRComplianceManager.instance) {
      GDPRComplianceManager.instance = new GDPRComplianceManager();
    }
    return GDPRComplianceManager.instance;
  }

  /**
   * Load user consents from database
   */
  private async loadUserConsents(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Type-safe query for gdpr_consent table
      const result = await supabase
        .from('gdpr_consent')
        .select('*')
        .eq('user_id', user.id);

      const { data } = result as SupabaseQueryResult<GDPRConsentRow[]>;

      if (data) {
        data.forEach((consent: GDPRConsentRow) => {
          this.userConsents.set(consent.consent_type, consent.consented);
        });
      }
    } catch (error) {
      console.error('Failed to load user consents:', error);
    }
  }

  /**
   * Update user consent
   */
  public async updateConsent(
    consentType: ConsentType,
    consented: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const consentRecord: ConsentRecord = {
        consent_type: consentType,
        consented,
        consent_date: consented ? new Date().toISOString() : undefined,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
      };

      // Type-safe upsert for gdpr_consent table
      const result = await supabase
        .from('gdpr_consent')
        .upsert({
          user_id: user.id,
          ...consentRecord,
          updated_at: new Date().toISOString(),
        });

      const { error } = result as SupabaseQueryResult<GDPRConsentRow>;

      if (error) {
        return { success: false, error: error.message };
      }

      // Update local cache
      this.userConsents.set(consentType, consented);

      // Log consent change
      await securityLogger.logGDPREvent('CONSENT', {
        consent_type: consentType,
        consented,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to update consent:', error);
      return { success: false, error: 'Failed to update consent' };
    }
  }

  /**
   * Get all user consents
   */
  public async getUserConsents(): Promise<Map<ConsentType, boolean>> {
    await this.loadUserConsents();
    return this.userConsents;
  }

  /**
   * Check if user has given specific consent
   */
  public hasConsent(consentType: ConsentType): boolean {
    return this.userConsents.get(consentType) || false;
  }

  /**
   * Request data export (Right to Access)
   */
  public async requestDataExport(): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Create data request with type-safe insert
      const result = await supabase
        .from('gdpr_data_requests')
        .insert({
          user_id: user.id,
          request_type: DataRequestType.EXPORT,
          status: DataRequestStatus.PENDING,
        })
        .select()
        .single();

      const { data, error } = result as SupabaseQueryResult<GDPRDataRequestRow>;

      if (error || !data) {
        return { success: false, error: error?.message || 'Failed to create request' };
      }

      // Log data export request
      await securityLogger.logGDPREvent('EXPORT', {
        request_id: data.id,
      });

      // Trigger async export process
      this.processDataExport(user.id, data.id);

      return { success: true, requestId: data.id };
    } catch (error) {
      console.error('Failed to request data export:', error);
      return { success: false, error: 'Failed to request data export' };
    }
  }

  /**
   * Process data export asynchronously
   */
  private async processDataExport(userId: string, requestId: string): Promise<void> {
    try {
      // Update status to processing
      await supabase
        .from('gdpr_data_requests')
        .update({ status: DataRequestStatus.PROCESSING })
        .eq('id', requestId);

      // Collect all user data
      const exportData = await this.collectUserData(userId);

      // Generate export file (JSON format)
      const exportJson = JSON.stringify(exportData, null, 2);
      const blob = new Blob([exportJson], { type: 'application/json' });

      // In production, upload to secure storage and generate signed URL
      // For now, create a data URL
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;

        // Update request with export URL
        await supabase
          .from('gdpr_data_requests')
          .update({
            status: DataRequestStatus.COMPLETED,
            completed_at: new Date().toISOString(),
            export_url: dataUrl, // In production, use secure storage URL
          })
          .eq('id', requestId);

        // Send notification email (implement email service)
        // await emailService.sendDataExportReady(userId, exportUrl);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Data export processing failed:', error);

      // Update status to failed
      await supabase
        .from('gdpr_data_requests')
        .update({
          status: DataRequestStatus.FAILED,
          notes: String(error),
        })
        .eq('id', requestId);
    }
  }

  /**
   * Collect all user data for export
   */
  private async collectUserData(userId: string): Promise<UserExportData> {
    const userData: UserExportData = {
      export_date: new Date().toISOString(),
      user_id: userId,
      transactions: [],
      monthly_statements: [],
      audit_logs: [],
      consent_records: [],
    };

    // Profile data
    const profileResult = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const { data: profile } = profileResult as SupabaseQueryResult<ProfileRow>;

    if (profile) {
      // Decrypt PII fields if encrypted
      userData.profile = await fieldEncryption.decryptPIIFields(
        profile,
        ['phone', 'date_of_birth']
      );
    }

    // Investor profile
    const investorProfileResult = await supabase
      .from('investor_profiles')
      .select('*')
      .eq('investor_id', userId)
      .maybeSingle();

    const { data: investorProfile } = investorProfileResult as SupabaseQueryResult<Record<string, unknown>>;

    if (investorProfile) {
      userData.investor_profile = await fieldEncryption.decryptPIIFields(
        investorProfile,
        ['tax_id', 'bank_account', 'bank_routing']
      );
    }

    // Transactions (V2 table)
    const transactionsResult = await supabase
      .from('transactions_v2')
      .select('*')
      .eq('investor_id', userId)
      .order('tx_date', { ascending: false })
      .order('id', { ascending: false }); // Deterministic tie-breaker for same-day ordering

    const { data: transactions } = transactionsResult as SupabaseQueryResult<TransactionV2Row[]>;

    userData.transactions = transactions || [];

    // Monthly statements
    const statementsResult = await supabase
      .from('monthly_statements')
      .select('*')
      .eq('investor_id', userId)
      .order('statement_period', { ascending: false });

    const { data: statements } = statementsResult as SupabaseQueryResult<unknown[]>;

    userData.monthly_statements = statements || [];

    // Audit logs (user's own actions)
    const auditLogsResult = await supabase
      .from('audit_log')
      .select('*')
      .eq('actor_user', userId)
      .order('created_at', { ascending: false })
      .limit(1000);

    const { data: auditLogs } = auditLogsResult as SupabaseQueryResult<AuditLogRow[]>;
    userData.audit_logs = auditLogs || [];

    // Consent records
    const consentsResult = await supabase
      .from('gdpr_consent')
      .select('*')
      .eq('user_id', userId);

    const { data: consents } = consentsResult as SupabaseQueryResult<GDPRConsentRow[]>;
    userData.consent_records = consents || [];

    return userData;
  }

  /**
   * Request data deletion (Right to be Forgotten)
   */
  public async requestDataDeletion(): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Create deletion request with type-safe insert
      const result = await supabase
        .from('gdpr_data_requests')
        .insert({
          user_id: user.id,
          request_type: DataRequestType.DELETE,
          status: DataRequestStatus.PENDING,
        })
        .select()
        .single();

      const { data, error } = result as SupabaseQueryResult<GDPRDataRequestRow>;

      if (error || !data) {
        return { success: false, error: error?.message || 'Failed to create request' };
      }

      // Log deletion request
      await securityLogger.logGDPREvent('DELETE', {
        request_id: data.id,
      });

      // Note: Actual deletion should be reviewed and approved manually
      // to comply with legal retention requirements

      return { success: true, requestId: data.id };
    } catch (error) {
      console.error('Failed to request data deletion:', error);
      return { success: false, error: 'Failed to request data deletion' };
    }
  }

  /**
   * Get user's data requests
   */
  public async getUserDataRequests(): Promise<DataRequest[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Type-safe query for data requests
      const result = await supabase
        .from('gdpr_data_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });

      const { data } = result as SupabaseQueryResult<GDPRDataRequestRow[]>;

      return data || [];
    } catch (error) {
      console.error('Failed to get data requests:', error);
      return [];
    }
  }

  /**
   * Download data export
   */
  public async downloadDataExport(requestId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get export request with type-safe query
      const result = await supabase
        .from('gdpr_data_requests')
        .select('*')
        .eq('id', requestId)
        .eq('user_id', user.id)
        .eq('request_type', DataRequestType.EXPORT)
        .eq('status', DataRequestStatus.COMPLETED)
        .single();

      const { data, error } = result as SupabaseQueryResult<GDPRDataRequestRow>;

      if (error || !data || !data.export_url) {
        return { success: false, error: 'Export not available' };
      }

      // Download file
      const link = document.createElement('a');
      link.href = data.export_url;
      link.download = `data-export-${requestId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { success: true };
    } catch (error) {
      console.error('Failed to download export:', error);
      return { success: false, error: 'Download failed' };
    }
  }

  /**
   * Get client IP address (for consent records)
   */
  private async getClientIP(): Promise<string | undefined> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Failed to get client IP:', error);
      return undefined;
    }
  }

  /**
   * Check if cookies are accepted
   */
  public areCookiesAccepted(): boolean {
    return this.hasConsent(ConsentType.COOKIES);
  }

  /**
   * Set cookie consent
   */
  public async setCookieConsent(accepted: boolean): Promise<void> {
    await this.updateConsent(ConsentType.COOKIES, accepted);

    if (accepted) {
      // Enable analytics, etc.
      localStorage.setItem('cookie_consent', 'accepted');
    } else {
      // Disable analytics, clear non-essential cookies
      localStorage.setItem('cookie_consent', 'rejected');
      this.clearNonEssentialCookies();
    }
  }

  /**
   * Clear non-essential cookies
   */
  private clearNonEssentialCookies(): void {
    // Clear analytics cookies
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.split('=');
      if (name.trim().startsWith('_ga') || name.trim().startsWith('_gid')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });

    // Clear localStorage items (except essential)
    const essentialKeys = ['cookie_consent', 'csrf_token'];
    Object.keys(localStorage).forEach(key => {
      if (!essentialKeys.includes(key)) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Export singleton instance
export const gdprManager = GDPRComplianceManager.getInstance();
