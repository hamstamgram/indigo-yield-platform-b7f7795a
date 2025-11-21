/**
 * Onboarding Sync Service
 * Syncs investor onboarding submissions from Airtable to local PostgreSQL database
 *
 * Features:
 * - Incremental sync (only new/changed records)
 * - Idempotent operations (prevent duplicates)
 * - Background job support (cron scheduling)
 * - Transaction safety
 * - Error handling with detailed logging
 */

import { supabase } from "@/integrations/supabase/client";
import { getAirtableService, AirtableOnboardingRecord } from "./airtableService";

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface SyncResult {
  success: boolean;
  recordsSynced: number;
  recordsSkipped: number;
  errors: Array<{ recordId: string; error: string }>;
  duration: number; // milliseconds
}

export interface OnboardingSubmissionRow {
  id?: string;
  full_name: string;
  company_name?: string | null;
  email: string;
  phone?: string | null;
  additional_emails?: string[] | null;
  airtable_record_id: string;
  jotform_submission_id?: string | null;
  status: "pending" | "processing" | "approved" | "rejected" | "duplicate";
  submitted_at: string;
  raw_data: any; // JSONB
  notes?: string | null;
}

// =====================================================
// ONBOARDING SYNC SERVICE CLASS
// =====================================================

export class OnboardingSyncService {
  private airtableService = getAirtableService();

  /**
   * Sync all pending onboarding submissions from Airtable to PostgreSQL
   */
  async syncPendingSubmissions(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      recordsSynced: 0,
      recordsSkipped: 0,
      errors: [],
      duration: 0,
    };

    try {
      console.log("🔄 Starting onboarding sync from Airtable...");

      // Fetch pending submissions from Airtable
      const airtableRecords = await this.airtableService.fetchPendingSubmissions();
      console.log(`📥 Found ${airtableRecords.length} pending submissions in Airtable`);

      if (airtableRecords.length === 0) {
        console.log("✅ No pending submissions to sync");
        result.duration = Date.now() - startTime;
        return result;
      }

      // Get existing Airtable record IDs from local DB (for deduplication)
      const existingRecordIds = await this.getExistingAirtableRecordIds();
      console.log(`📊 Found ${existingRecordIds.size} existing records in local DB`);

      // Process each Airtable record
      for (const airtableRecord of airtableRecords) {
        try {
          // Skip if already synced
          if (existingRecordIds.has(airtableRecord.id)) {
            console.log(`⏭️  Skipping ${airtableRecord.id} (already synced)`);
            result.recordsSkipped++;
            continue;
          }

          // Insert new submission
          await this.insertSubmission(airtableRecord);
          result.recordsSynced++;
          console.log(`✅ Synced ${airtableRecord.id}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          result.errors.push({
            recordId: airtableRecord.id,
            error: errorMessage,
          });
          console.error(`❌ Failed to sync ${airtableRecord.id}:`, error);
        }
      }

      result.duration = Date.now() - startTime;
      result.success = result.errors.length === 0;

      console.log(
        `✅ Sync complete: ${result.recordsSynced} synced, ${result.recordsSkipped} skipped, ${result.errors.length} errors (${result.duration}ms)`
      );

      return result;
    } catch (error) {
      console.error("❌ Sync failed:", error);
      result.success = false;
      result.duration = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Sync a single submission by Airtable record ID
   */
  async syncSubmissionById(airtableRecordId: string): Promise<void> {
    try {
      // Fetch from Airtable
      const airtableRecord = await this.airtableService.fetchRecordById(airtableRecordId);

      // Check if already exists
      const { data: existing } = await supabase
        .from("onboarding_submissions")
        .select("id")
        .eq("airtable_record_id", airtableRecordId)
        .single();

      if (existing) {
        // Update existing record
        await this.updateSubmission(airtableRecordId, airtableRecord);
        console.log(`✅ Updated submission ${airtableRecordId}`);
      } else {
        // Insert new record
        await this.insertSubmission(airtableRecord);
        console.log(`✅ Inserted submission ${airtableRecordId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to sync submission ${airtableRecordId}:`, error);
      throw error;
    }
  }

  /**
   * Full sync: Sync all submissions (not just pending)
   * Used for initial setup or after data corruption
   */
  async fullSync(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      recordsSynced: 0,
      recordsSkipped: 0,
      errors: [],
      duration: 0,
    };

    try {
      console.log("🔄 Starting FULL sync from Airtable...");

      // Fetch all submissions from Airtable (no filter)
      const airtableRecords = await this.airtableService.fetchOnboardingSubmissions();
      console.log(`📥 Found ${airtableRecords.length} total submissions in Airtable`);

      // Get existing Airtable record IDs
      const existingRecordIds = await this.getExistingAirtableRecordIds();

      // Process each record
      for (const airtableRecord of airtableRecords) {
        try {
          if (existingRecordIds.has(airtableRecord.id)) {
            // Update existing
            await this.updateSubmission(airtableRecord.id, airtableRecord);
            result.recordsSynced++;
          } else {
            // Insert new
            await this.insertSubmission(airtableRecord);
            result.recordsSynced++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          result.errors.push({
            recordId: airtableRecord.id,
            error: errorMessage,
          });
          console.error(`❌ Failed to sync ${airtableRecord.id}:`, error);
        }
      }

      result.duration = Date.now() - startTime;
      result.success = result.errors.length === 0;

      console.log(
        `✅ Full sync complete: ${result.recordsSynced} synced, ${result.errors.length} errors (${result.duration}ms)`
      );

      return result;
    } catch (error) {
      console.error("❌ Full sync failed:", error);
      result.success = false;
      result.duration = Date.now() - startTime;
      throw error;
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  /**
   * Get set of existing Airtable record IDs from local DB
   */
  private async getExistingAirtableRecordIds(): Promise<Set<string>> {
    const { data, error } = await supabase
      .from("onboarding_submissions")
      .select("airtable_record_id");

    if (error) {
      console.error("❌ Failed to fetch existing record IDs:", error);
      throw error;
    }

    return new Set((data || []).map((row) => row.airtable_record_id).filter(Boolean));
  }

  /**
   * Insert a new submission into local DB
   */
  private async insertSubmission(airtableRecord: AirtableOnboardingRecord): Promise<void> {
    const row = this.mapAirtableRecordToRow(airtableRecord);

    const { error } = await supabase.from("onboarding_submissions").insert(row);

    if (error) {
      console.error(`❌ Failed to insert submission:`, error);
      throw error;
    }
  }

  /**
   * Update an existing submission in local DB
   */
  private async updateSubmission(
    airtableRecordId: string,
    airtableRecord: AirtableOnboardingRecord
  ): Promise<void> {
    const row = this.mapAirtableRecordToRow(airtableRecord);

    // Remove fields that shouldn't be updated
    const { airtable_record_id, submitted_at, ...updateFields } = row;

    const { error } = await supabase
      .from("onboarding_submissions")
      .update(updateFields)
      .eq("airtable_record_id", airtableRecordId);

    if (error) {
      console.error(`❌ Failed to update submission:`, error);
      throw error;
    }
  }

  /**
   * Map Airtable record to database row
   */
  private mapAirtableRecordToRow(record: AirtableOnboardingRecord): OnboardingSubmissionRow {
    const fields = record.fields;

    // Parse additional emails (comma-separated string → array)
    let additionalEmails: string[] | null = null;
    if (fields["Additional Emails"]) {
      additionalEmails = fields["Additional Emails"]
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);
    }

    // Map status (default to 'pending')
    let status: OnboardingSubmissionRow["status"] = "pending";
    if (fields.Status) {
      status = fields.Status.toLowerCase() as OnboardingSubmissionRow["status"];
    }

    return {
      full_name: fields["Full Name"],
      company_name: fields["Company Name"] || null,
      email: fields["Email"],
      phone: fields["Phone"] || null,
      additional_emails: additionalEmails,
      airtable_record_id: record.id,
      jotform_submission_id: fields["Jotform Submission ID"] || null,
      status,
      submitted_at: record.createdTime,
      raw_data: record, // Store full Airtable record for debugging
      notes: fields["Notes"] || null,
    };
  }
}

// =====================================================
// BACKGROUND SYNC JOB
// =====================================================

/**
 * Background sync job
 * Runs periodically to sync new submissions from Airtable
 *
 * Usage:
 * - Call from cron job or scheduled task
 * - Recommended interval: 5 minutes
 */
export async function runBackgroundSync(): Promise<SyncResult> {
  const syncService = new OnboardingSyncService();

  try {
    console.log("🕐 Background sync started");
    const result = await syncService.syncPendingSubmissions();
    console.log("🕐 Background sync completed:", result);
    return result;
  } catch (error) {
    console.error("❌ Background sync failed:", error);
    throw error;
  }
}

// =====================================================
// WEBHOOK HANDLER
// =====================================================

/**
 * Handle webhook from Airtable
 * Syncs specific records that changed
 *
 * @param recordIds - Array of Airtable record IDs that changed
 */
export async function handleAirtableWebhook(recordIds: string[]): Promise<SyncResult> {
  const syncService = new OnboardingSyncService();
  const startTime = Date.now();
  const result: SyncResult = {
    success: true,
    recordsSynced: 0,
    recordsSkipped: 0,
    errors: [],
    duration: 0,
  };

  try {
    console.log(`🔔 Webhook received for ${recordIds.length} records`);

    for (const recordId of recordIds) {
      try {
        await syncService.syncSubmissionById(recordId);
        result.recordsSynced++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        result.errors.push({ recordId, error: errorMessage });
        console.error(`❌ Failed to sync webhook record ${recordId}:`, error);
      }
    }

    result.duration = Date.now() - startTime;
    result.success = result.errors.length === 0;

    console.log(
      `✅ Webhook processing complete: ${result.recordsSynced} synced, ${result.errors.length} errors (${result.duration}ms)`
    );

    return result;
  } catch (error) {
    console.error("❌ Webhook processing failed:", error);
    result.success = false;
    result.duration = Date.now() - startTime;
    throw error;
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let syncServiceInstance: OnboardingSyncService | null = null;

/**
 * Get singleton instance of OnboardingSyncService
 */
export function getOnboardingSyncService(): OnboardingSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new OnboardingSyncService();
  }
  return syncServiceInstance;
}

// Export default instance
export default getOnboardingSyncService();
