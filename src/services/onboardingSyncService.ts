import { supabase } from "@/integrations/supabase/client";

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

// =====================================================
// ONBOARDING SYNC SERVICE CLASS
// =====================================================

export class OnboardingSyncService {
  /**
   * Sync all pending onboarding submissions from Airtable to PostgreSQL
   * USES EDGE FUNCTION to securely access Airtable API Keys
   */
  async syncPendingSubmissions(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      console.log("🔄 Starting onboarding sync via Edge Function...");

      const { data, error } = await supabase.functions.invoke("sync-airtable", {
        method: "POST",
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      console.log("✅ Sync Result:", data);

      return {
        success: data.success,
        recordsSynced: data.recordsSynced || 0,
        recordsSkipped: data.recordsSkipped || 0,
        errors: data.error ? [{ recordId: "global", error: data.error }] : [],
        duration: Date.now() - startTime,
      };
    } catch (error) {
      console.error("❌ Sync failed:", error);
      return {
        success: false,
        recordsSynced: 0,
        recordsSkipped: 0,
        errors: [
          { recordId: "global", error: error instanceof Error ? error.message : "Unknown error" },
        ],
        duration: Date.now() - startTime,
      };
    }
  }

  // Stub methods for compatibility if called elsewhere,
  // but ideally should be migrated to Edge Function too if needed.
  async syncSubmissionById(airtableRecordId: string): Promise<void> {
    console.warn("syncSubmissionById is deprecated on client side. Use Edge Function.");
  }

  async fullSync(): Promise<SyncResult> {
    return this.syncPendingSubmissions(); // Reuse edge function
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let syncServiceInstance: OnboardingSyncService | null = null;

export function getOnboardingSyncService(): OnboardingSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new OnboardingSyncService();
  }
  return syncServiceInstance;
}

export default getOnboardingSyncService();
