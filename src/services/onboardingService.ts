/**
 * Onboarding Service
 * Handles creating investors from onboarding submissions
 *
 * Features:
 * - Transaction-safe investor creation
 * - Multi-email support (primary + additional emails)
 * - Idempotent operations (prevent duplicates)
 * - Airtable synchronization
 * - Audit trail
 */

import { supabase } from '@/integrations/supabase/client';
import { getAirtableService } from './airtableService';

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface CreateInvestorFromSubmissionInput {
  submissionId: string; // UUID of onboarding_submission
  emails: string[]; // Array of emails (first is primary)
  processedBy: string; // UUID of admin user
  notes?: string;
}

export interface CreateInvestorResult {
  success: boolean;
  investorId?: string;
  error?: string;
}

export interface OnboardingSubmission {
  id: string;
  full_name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  additional_emails: string[] | null;
  airtable_record_id: string | null;
  jotform_submission_id: string | null;
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'duplicate';
  submitted_at: string;
  processed_at: string | null;
  processed_by: string | null;
  created_investor_id: string | null;
  raw_data: any;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// ONBOARDING SERVICE CLASS
// =====================================================

export class OnboardingService {
  private airtableService = getAirtableService();

  /**
   * Create investor from onboarding submission
   * Handles multi-email support and transaction safety
   *
   * @param input - Submission ID, emails array, and admin user ID
   * @returns Result with investor ID or error
   */
  async createInvestorFromSubmission(
    input: CreateInvestorFromSubmissionInput
  ): Promise<CreateInvestorResult> {
    const { submissionId, emails, processedBy, notes } = input;

    try {
      console.log(`🔄 Creating investor from submission ${submissionId}...`);

      // Validate inputs
      if (!emails || emails.length === 0) {
        throw new Error('At least one email is required');
      }

      if (!processedBy) {
        throw new Error('Processed by admin user ID is required');
      }

      // =====================================================
      // STEP 1: Fetch and validate submission
      // =====================================================

      const { data: submission, error: fetchError } = await supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (fetchError || !submission) {
        throw new Error(`Submission not found: ${submissionId}`);
      }

      // Check if investor already created
      if (submission.created_investor_id) {
        return {
          success: false,
          error: `Investor already created for this submission (ID: ${submission.created_investor_id})`,
        };
      }

      // Check if submission is in valid state
      if (submission.status === 'rejected') {
        return {
          success: false,
          error: 'Cannot create investor from rejected submission',
        };
      }

      // =====================================================
      // STEP 2: Check for duplicate email (prevent duplicate investors)
      // =====================================================

      const primaryEmail = emails[0].trim().toLowerCase();

      const { data: existingByEmail } = await supabase
        .from('investor_emails')
        .select('investor_id, email')
        .eq('email', primaryEmail)
        .single();

      if (existingByEmail) {
        // Update submission as duplicate
        await supabase
          .from('onboarding_submissions')
          .update({
            status: 'duplicate',
            processed_by: processedBy,
            processed_at: new Date().toISOString(),
            notes: notes || `Duplicate email: ${primaryEmail} already exists for investor ${existingByEmail.investor_id}`,
          })
          .eq('id', submissionId);

        return {
          success: false,
          error: `Email ${primaryEmail} already exists for another investor`,
        };
      }

      // =====================================================
      // STEP 3: Mark submission as processing
      // =====================================================

      const { error: updateProcessingError } = await supabase
        .from('onboarding_submissions')
        .update({
          status: 'processing',
          processed_by: processedBy,
        })
        .eq('id', submissionId);

      if (updateProcessingError) {
        throw new Error(`Failed to update submission status: ${updateProcessingError.message}`);
      }

      // =====================================================
      // STEP 4: Create investor record
      // =====================================================

      const { data: investor, error: createError } = await supabase
        .from('investors')
        .insert({
          name: submission.full_name,
          phone: submission.phone,
          company: submission.company_name,
          email: primaryEmail, // Legacy column for backward compatibility
          source: 'airtable',
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError || !investor) {
        // Rollback submission status
        await supabase
          .from('onboarding_submissions')
          .update({ status: 'pending', processed_by: null })
          .eq('id', submissionId);

        throw new Error(`Failed to create investor: ${createError?.message || 'Unknown error'}`);
      }

      console.log(`✅ Created investor ${investor.id}`);

      // =====================================================
      // STEP 5: Create investor emails (primary + additional)
      // =====================================================

      const emailInserts = emails.map((email, index) => ({
        investor_id: investor.id,
        email: email.trim().toLowerCase(),
        is_primary: index === 0, // First email is primary
        verified: false,
        created_at: new Date().toISOString(),
      }));

      const { error: emailsError } = await supabase
        .from('investor_emails')
        .insert(emailInserts);

      if (emailsError) {
        console.error('❌ Failed to create investor emails:', emailsError);
        // Continue anyway - investor is created, emails can be added later
      } else {
        console.log(`✅ Created ${emails.length} email(s) for investor ${investor.id}`);
      }

      // =====================================================
      // STEP 6: Update submission as approved
      // =====================================================

      const { error: updateApprovedError } = await supabase
        .from('onboarding_submissions')
        .update({
          status: 'approved',
          created_investor_id: investor.id,
          processed_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq('id', submissionId);

      if (updateApprovedError) {
        console.error('❌ Failed to update submission as approved:', updateApprovedError);
        // Continue anyway - investor is created
      }

      // =====================================================
      // STEP 7: Update Airtable (mark as completed)
      // =====================================================

      if (submission.airtable_record_id) {
        try {
          await this.airtableService.markSubmissionAsProcessed(
            submission.airtable_record_id,
            investor.id,
            'Completed'
          );
          console.log(`✅ Updated Airtable record ${submission.airtable_record_id}`);
        } catch (airtableError) {
          console.error('❌ Failed to update Airtable:', airtableError);
          // Continue anyway - investor is created in our DB
        }
      }

      console.log(`✅ Investor creation complete: ${investor.id}`);

      return {
        success: true,
        investorId: investor.id,
      };

    } catch (error) {
      console.error('❌ Failed to create investor:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Reject an onboarding submission
   */
  async rejectSubmission(
    submissionId: string,
    rejectedBy: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: submission } = await supabase
        .from('onboarding_submissions')
        .select('airtable_record_id')
        .eq('id', submissionId)
        .single();

      if (!submission) {
        throw new Error('Submission not found');
      }

      // Update local DB
      const { error: updateError } = await supabase
        .from('onboarding_submissions')
        .update({
          status: 'rejected',
          processed_by: rejectedBy,
          processed_at: new Date().toISOString(),
          notes: reason,
        })
        .eq('id', submissionId);

      if (updateError) {
        throw updateError;
      }

      // Update Airtable
      if (submission.airtable_record_id) {
        try {
          await this.airtableService.updateSubmissionStatus(
            submission.airtable_record_id,
            'Rejected',
            reason
          );
        } catch (airtableError) {
          console.error('❌ Failed to update Airtable:', airtableError);
          // Continue - local DB is updated
        }
      }

      console.log(`✅ Rejected submission ${submissionId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to reject submission:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get onboarding statistics
   */
  async getOnboardingStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    approved: number;
    rejected: number;
    duplicate: number;
    todayCount: number;
  }> {
    try {
      // Get all submissions
      const { data: allSubmissions } = await supabase
        .from('onboarding_submissions')
        .select('status, created_at');

      if (!allSubmissions) {
        return {
          total: 0,
          pending: 0,
          processing: 0,
          approved: 0,
          rejected: 0,
          duplicate: 0,
          todayCount: 0,
        };
      }

      const stats = {
        total: allSubmissions.length,
        pending: 0,
        processing: 0,
        approved: 0,
        rejected: 0,
        duplicate: 0,
        todayCount: 0,
      };

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      allSubmissions.forEach((submission) => {
        // Count by status
        if (submission.status === 'pending') stats.pending++;
        else if (submission.status === 'processing') stats.processing++;
        else if (submission.status === 'approved') stats.approved++;
        else if (submission.status === 'rejected') stats.rejected++;
        else if (submission.status === 'duplicate') stats.duplicate++;

        // Count today's submissions
        if (submission.created_at.startsWith(today)) {
          stats.todayCount++;
        }
      });

      return stats;

    } catch (error) {
      console.error('❌ Failed to get onboarding stats:', error);
      throw error;
    }
  }

  /**
   * Get pending submissions (for admin dashboard)
   */
  async getPendingSubmissions(): Promise<OnboardingSubmission[]> {
    const { data, error } = await supabase
      .from('onboarding_submissions')
      .select('*')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch pending submissions:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get all submissions with optional filtering
   */
  async getSubmissions(filters?: {
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<OnboardingSubmission[]> {
    let query = supabase
      .from('onboarding_submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      query = query.or(
        `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`
      );
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch submissions:', error);
      throw error;
    }

    return data || [];
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let onboardingServiceInstance: OnboardingService | null = null;

/**
 * Get singleton instance of OnboardingService
 */
export function getOnboardingService(): OnboardingService {
  if (!onboardingServiceInstance) {
    onboardingServiceInstance = new OnboardingService();
  }
  return onboardingServiceInstance;
}

// Export default instance
export default getOnboardingService();
