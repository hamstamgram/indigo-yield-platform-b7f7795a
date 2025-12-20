/**
 * GDPR Compliance Manager
 * Implements data privacy rights and consent management
 */

import { supabase } from '@/integrations/supabase/client';
import { securityLogger } from './security-logger';
import { fieldEncryption } from './encryption';

export enum ConsentType {
  MARKETING = 'MARKETING',
  ANALYTICS = 'ANALYTICS',
  PERSONALIZATION = 'PERSONALIZATION',
  THIRD_PARTY = 'THIRD_PARTY',
  COOKIES = 'COOKIES',
  DATA_PROCESSING = 'DATA_PROCESSING',
}

export enum DataRequestType {
  EXPORT = 'EXPORT',
  DELETE = 'DELETE',
  RECTIFY = 'RECTIFY',
}

export enum DataRequestStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

interface ConsentRecord {
  consent_type: ConsentType;
  consented: boolean;
  consent_date?: string;
  ip_address?: string;
  user_agent?: string;
}

interface DataRequest {
  id: string;
  request_type: DataRequestType;
  status: DataRequestStatus;
  requested_at: string;
  completed_at?: string;
  export_url?: string;
  notes?: string;
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

      // Cast supabase to any to avoid excessive type depth inference in query builder
      const result = await (supabase as any)
        .from('gdpr_consent')
        .select('*')
        .eq('user_id', user.id);

      const { data } = result as { data: any; error: any };

      if (data) {
        data.forEach((consent: any) => {
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

      // Cast supabase to any - gdpr_consent table not in generated types
      const result = await (supabase as any)
        .from('gdpr_consent')
        .upsert({
          user_id: user.id,
          ...consentRecord,
          updated_at: new Date().toISOString(),
        });

      const { error } = result as { data: any; error: any };

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

      // Create data request
      // Cast supabase to any - gdpr_data_requests table not in generated types
      const result = await (supabase as any)
        .from('gdpr_data_requests' as any)
        .insert({
          user_id: user.id,
          request_type: DataRequestType.EXPORT,
          status: DataRequestStatus.PENDING,
        })
        .select()
        .single();

      const { data, error } = result as { data: any; error: any };

      if (error) {
        return { success: false, error: error.message };
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
      // Cast supabase to any - gdpr_data_requests table not in generated types
      await (supabase as any)
        .from('gdpr_data_requests' as any)
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
        // Cast supabase to any - gdpr_data_requests table not in generated types
        await (supabase as any)
          .from('gdpr_data_requests' as any)
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
      // Cast supabase to any - gdpr_data_requests table not in generated types
      await (supabase as any)
        .from('gdpr_data_requests' as any)
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
  private async collectUserData(userId: string): Promise<any> {
    const userData: any = {
      export_date: new Date().toISOString(),
      user_id: userId,
    };

    // Profile data
    // Cast supabase to any to avoid excessive type depth inference in query builder
    const profileResult = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: profile } = profileResult as { data: any; error: any };

    if (profile) {
      // Decrypt PII fields if encrypted
      userData.profile = await fieldEncryption.decryptPIIFields(
        profile,
        ['phone', 'date_of_birth']
      );
    }

    // Investor profile
    // Cast supabase to any to avoid excessive type depth inference in query builder
    const result = await (supabase as any)
      .from('investor_profiles')
      .select('*')
      .eq('investor_id', userId)
      .single();

    const { data: investorProfile } = result as { data: any; error: any };

    if (investorProfile) {
      userData.investor_profile = await fieldEncryption.decryptPIIFields(
        investorProfile,
        ['tax_id', 'bank_account', 'bank_routing']
      );
    }

    // Transactions (V2 table)
    // Cast supabase to any to avoid excessive type depth inference in query builder
    const transactionsResult = await (supabase as any)
      .from('transactions_v2')
      .select('*')
      .eq('investor_id', userId)
      .order('tx_date', { ascending: false })
      .order('id', { ascending: false }); // Deterministic tie-breaker for same-day ordering

    const { data: transactions } = transactionsResult as { data: any; error: any };

    userData.transactions = transactions || [];

    // Monthly statements
    // Cast supabase to any to avoid excessive type depth inference in query builder
    const statementsResult = await (supabase as any)
      .from('monthly_statements')
      .select('*')
      .eq('investor_id', userId)
      .order('statement_period', { ascending: false });

    const { data: statements } = statementsResult as { data: any; error: any };

    userData.monthly_statements = statements || [];

    // Audit logs (user's own actions)
    // Cast supabase to any to avoid excessive type depth inference in query builder
    const auditLogsResult = await (supabase as any)
      .from('audit_log')
      .select('*')
      .eq('actor_user', userId)
      .order('created_at', { ascending: false })
      .limit(1000);

    const { data: auditLogs } = auditLogsResult as { data: any; error: any };
    userData.audit_logs = auditLogs || [];

    // Consent records
    // Cast supabase to any - gdpr_consent table not in generated types
    const consentsResult = await (supabase as any)
      .from('gdpr_consent')
      .select('*')
      .eq('user_id', userId);

    const { data: consents } = consentsResult as { data: any; error: any };
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

      // Create deletion request
      // Cast supabase to any - gdpr_data_requests table not in generated types
      const result = await (supabase as any)
        .from('gdpr_data_requests' as any)
        .insert({
          user_id: user.id,
          request_type: DataRequestType.DELETE,
          status: DataRequestStatus.PENDING,
        })
        .select()
        .single();

      const { data, error } = result as { data: any; error: any };

      if (error) {
        return { success: false, error: error.message };
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

      // Cast supabase to any to avoid excessive type depth inference in query builder
      const result = await (supabase as any)
        .from('gdpr_data_requests' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });

      const { data } = result as { data: any; error: any };

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

      // Get export request
      // Cast supabase to any to avoid excessive type depth inference in query builder
      const result = await (supabase as any)
        .from('gdpr_data_requests' as any)
        .select('*')
        .eq('id', requestId)
        .eq('user_id', user.id)
        .eq('request_type', DataRequestType.EXPORT)
        .eq('status', DataRequestStatus.COMPLETED)
        .single();

      const { data, error } = result as { data: any; error: any };

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

// React components for GDPR UI
import { useState, useEffect } from 'react';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = async () => {
    await gdprManager.setCookieConsent(true);
    setVisible(false);
  };

  const handleReject = async () => {
    await gdprManager.setCookieConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold">Cookie Notice</h3>
          <p className="text-sm text-gray-600">
            We use cookies to improve your experience. By continuing to use our site, you accept our use of cookies.
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={handleReject}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}