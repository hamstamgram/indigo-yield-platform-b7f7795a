/**
 * Airtable Service
 * Handles all interactions with Airtable API for investor onboarding
 *
 * Features:
 * - Rate limiting (4 concurrent requests, under Airtable's 5/sec limit)
 * - Pagination support for large datasets
 * - Retry logic with exponential backoff
 * - Type-safe interfaces
 * - Webhook signature verification
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import pLimit from "p-limit";
import crypto from "crypto";

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface AirtableOnboardingRecord {
  id: string; // Airtable record ID
  createdTime: string;
  fields: {
    "Full Name": string;
    Email: string;
    Phone?: string;
    "Company Name"?: string;
    "Additional Emails"?: string; // Comma-separated
    "Jotform Submission ID"?: string;
    Status?: "Pending" | "Processing" | "Completed" | "Rejected";
    "Created Investor ID"?: string;
    Notes?: string;
  };
}

export interface AirtableListResponse {
  records: AirtableOnboardingRecord[];
  offset?: string; // Pagination cursor
}

export interface AirtableUpdateFields {
  fields: Partial<AirtableOnboardingRecord["fields"]>;
}

export interface AirtableWebhookPayload {
  webhook: {
    id: string;
  };
  base: {
    id: string;
  };
  timestamp: string;
  changedTablesById: {
    [tableId: string]: {
      createdRecordsById?: { [recordId: string]: any };
      changedRecordsById?: { [recordId: string]: any };
      destroyedRecordIds?: string[];
    };
  };
}

export interface AirtableServiceConfig {
  apiKey: string;
  baseId: string;
  tableName: string;
  webhookSecret?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

// =====================================================
// AIRTABLE SERVICE CLASS
// =====================================================

export class AirtableService {
  private client: AxiosInstance;
  private baseId: string;
  private tableName: string;
  private webhookSecret?: string;
  private maxRetries: number;
  private retryDelayMs: number;

  // Rate limiter: 4 concurrent requests (stay under 5/sec limit)
  private rateLimiter = pLimit(4);

  constructor(config: AirtableServiceConfig) {
    this.baseId = config.baseId;
    this.tableName = config.tableName;
    this.webhookSecret = config.webhookSecret;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelayMs = config.retryDelayMs || 1000;

    // Initialize Axios client
    this.client = axios.create({
      baseURL: "https://api.airtable.com/v0",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 10000, // 10 second timeout
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          // Server responded with error status
          const status = error.response.status;
          const message = (error.response.data as any)?.error?.message || error.message;

          throw new Error(`Airtable API Error (${status}): ${message}`);
        } else if (error.request) {
          // Request made but no response
          throw new Error("No response from Airtable API");
        } else {
          // Error in request setup
          throw new Error(`Airtable request error: ${error.message}`);
        }
      }
    );
  }

  // =====================================================
  // FETCH METHODS
  // =====================================================

  /**
   * Fetch onboarding submissions from Airtable
   * Supports pagination and filtering
   *
   * @param filterFormula - Airtable formula syntax (e.g., "{Status} = 'Pending'")
   * @param maxRecords - Maximum number of records to fetch (optional)
   * @returns Array of onboarding records
   */
  async fetchOnboardingSubmissions(
    filterFormula?: string,
    maxRecords?: number
  ): Promise<AirtableOnboardingRecord[]> {
    const allRecords: AirtableOnboardingRecord[] = [];
    let offset: string | undefined;
    let fetchedCount = 0;

    try {
      do {
        // Rate-limited API call
        const response = await this.rateLimiter(() =>
          this.retryWithBackoff(async () => {
            return await this.client.get<AirtableListResponse>(
              `/${this.baseId}/${encodeURIComponent(this.tableName)}`,
              {
                params: {
                  pageSize: 100, // Max per request
                  offset,
                  ...(filterFormula && { filterByFormula: filterFormula }),
                },
              }
            );
          })
        );

        const records = response.data.records;
        allRecords.push(...records);
        fetchedCount += records.length;

        // Update offset for next page
        offset = response.data.offset;

        // Stop if we've reached maxRecords
        if (maxRecords && fetchedCount >= maxRecords) {
          break;
        }
      } while (offset); // Continue while there are more pages

      console.log(`✅ Fetched ${allRecords.length} records from Airtable`);
      return allRecords;
    } catch (error) {
      console.error("❌ Failed to fetch Airtable submissions:", error);
      throw error;
    }
  }

  /**
   * Fetch a single record by Airtable record ID
   */
  async fetchRecordById(recordId: string): Promise<AirtableOnboardingRecord> {
    try {
      const response = await this.rateLimiter(() =>
        this.retryWithBackoff(async () => {
          return await this.client.get<AirtableOnboardingRecord>(
            `/${this.baseId}/${encodeURIComponent(this.tableName)}/${recordId}`
          );
        })
      );

      return response.data;
    } catch (error) {
      console.error(`❌ Failed to fetch Airtable record ${recordId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch pending submissions (not yet processed)
   */
  async fetchPendingSubmissions(): Promise<AirtableOnboardingRecord[]> {
    return this.fetchOnboardingSubmissions("AND({Status} = 'Pending', {Created Investor ID} = '')");
  }

  // =====================================================
  // UPDATE METHODS
  // =====================================================

  /**
   * Update a single Airtable record
   */
  async updateRecord(
    recordId: string,
    update: AirtableUpdateFields
  ): Promise<AirtableOnboardingRecord> {
    try {
      const response = await this.rateLimiter(() =>
        this.retryWithBackoff(async () => {
          return await this.client.patch<AirtableOnboardingRecord>(
            `/${this.baseId}/${encodeURIComponent(this.tableName)}/${recordId}`,
            update
          );
        })
      );

      console.log(`✅ Updated Airtable record ${recordId}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to update Airtable record ${recordId}:`, error);
      throw error;
    }
  }

  /**
   * Mark submission as processed (investor created)
   */
  async markSubmissionAsProcessed(
    recordId: string,
    investorId: string,
    status: "Completed" | "Rejected" = "Completed"
  ): Promise<void> {
    await this.updateRecord(recordId, {
      fields: {
        Status: status,
        "Created Investor ID": investorId,
      },
    });
  }

  /**
   * Update submission status
   */
  async updateSubmissionStatus(
    recordId: string,
    status: "Pending" | "Processing" | "Completed" | "Rejected",
    notes?: string
  ): Promise<void> {
    const fields: Partial<AirtableOnboardingRecord["fields"]> = { Status: status };
    if (notes) {
      fields.Notes = notes;
    }

    await this.updateRecord(recordId, { fields });
  }

  /**
   * Bulk update multiple records
   * Airtable allows up to 10 records per request
   */
  async bulkUpdateRecords(
    updates: Array<{ id: string; fields: Partial<AirtableOnboardingRecord["fields"]> }>
  ): Promise<AirtableOnboardingRecord[]> {
    const BATCH_SIZE = 10; // Airtable limit
    const results: AirtableOnboardingRecord[] = [];

    // Split into batches of 10
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);

      try {
        const response = await this.rateLimiter(() =>
          this.retryWithBackoff(async () => {
            return await this.client.patch<{ records: AirtableOnboardingRecord[] }>(
              `/${this.baseId}/${encodeURIComponent(this.tableName)}`,
              { records: batch }
            );
          })
        );

        results.push(...response.data.records);
        console.log(`✅ Updated batch of ${batch.length} records`);
      } catch (error) {
        console.error(`❌ Failed to update batch:`, error);
        throw error;
      }
    }

    return results;
  }

  // =====================================================
  // WEBHOOK METHODS
  // =====================================================

  /**
   * Verify webhook signature from Airtable
   * Uses HMAC-SHA256 with webhook secret
   */
  verifyWebhookSignature(payload: string, signature: string, timestamp: string): boolean {
    if (!this.webhookSecret) {
      console.warn("⚠️ Webhook secret not configured");
      return false;
    }

    try {
      // Construct message: timestamp.payload
      const message = `${timestamp}.${payload}`;

      // Compute HMAC-SHA256
      const hmac = crypto.createHmac("sha256", this.webhookSecret).update(message).digest("hex");

      // Compare signatures (constant-time comparison)
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hmac));
    } catch (error) {
      console.error("❌ Webhook signature verification failed:", error);
      return false;
    }
  }

  /**
   * Parse webhook payload and extract changed records
   */
  parseWebhookPayload(payload: AirtableWebhookPayload): {
    created: string[];
    changed: string[];
    destroyed: string[];
  } {
    const result = {
      created: [] as string[],
      changed: [] as string[],
      destroyed: [] as string[],
    };

    // Extract record IDs from webhook payload
    for (const tableChanges of Object.values(payload.changedTablesById)) {
      if (tableChanges.createdRecordsById) {
        result.created.push(...Object.keys(tableChanges.createdRecordsById));
      }
      if (tableChanges.changedRecordsById) {
        result.changed.push(...Object.keys(tableChanges.changedRecordsById));
      }
      if (tableChanges.destroyedRecordIds) {
        result.destroyed.push(...tableChanges.destroyedRecordIds);
      }
    }

    return result;
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Retry a function with exponential backoff
   */
  private async retryWithBackoff<T>(fn: () => Promise<T>, attempt: number = 1): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= this.maxRetries) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, etc.
      const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
      console.log(`⏳ Retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries})...`);

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.retryWithBackoff(fn, attempt + 1);
    }
  }

  /**
   * Test connection to Airtable
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.fetchOnboardingSubmissions(undefined, 1);
      console.log("✅ Airtable connection successful");
      return true;
    } catch (error) {
      console.error("❌ Airtable connection failed:", error);
      return false;
    }
  }

  /**
   * Get statistics about onboarding submissions
   */
  async getSubmissionStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    rejected: number;
  }> {
    try {
      const allRecords = await this.fetchOnboardingSubmissions();

      const stats = {
        total: allRecords.length,
        pending: 0,
        processing: 0,
        completed: 0,
        rejected: 0,
      };

      allRecords.forEach((record) => {
        const status = record.fields.Status || "Pending";
        stats[status.toLowerCase() as keyof typeof stats]++;
      });

      return stats;
    } catch (error) {
      console.error("❌ Failed to get submission stats:", error);
      throw error;
    }
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Create AirtableService instance from environment variables
 */
export function createAirtableService(): AirtableService {
  const apiKey = process.env.VITE_AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY;
  const baseId = process.env.VITE_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
  const tableName =
    process.env.VITE_AIRTABLE_TABLE_NAME ||
    process.env.AIRTABLE_TABLE_NAME ||
    "Investor Onboarding";
  const webhookSecret =
    process.env.VITE_AIRTABLE_WEBHOOK_SECRET || process.env.AIRTABLE_WEBHOOK_SECRET;

  // Only throw error at runtime, not during build
  // During Next.js build, process.env.NEXT_PHASE will be set
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
                      process.env.NEXT_PHASE === 'phase-export';

  if (!apiKey || !baseId) {
    if (isBuildTime) {
      // During build, return a stub service to allow static analysis
      console.warn('⚠️ Airtable credentials not configured - service will not be functional');
      // Return stub service with placeholder values
      return new AirtableService({
        apiKey: 'build-time-placeholder',
        baseId: 'build-time-placeholder',
        tableName,
        webhookSecret,
      });
    } else {
      throw new Error(
        "Missing required Airtable configuration. Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in environment variables."
      );
    }
  }

  return new AirtableService({
    apiKey,
    baseId,
    tableName,
    webhookSecret,
  });
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let airtableServiceInstance: AirtableService | null = null;

/**
 * Get singleton instance of AirtableService
 */
export function getAirtableService(): AirtableService {
  if (!airtableServiceInstance) {
    airtableServiceInstance = createAirtableService();
  }
  return airtableServiceInstance;
}

// Export default instance
export default getAirtableService();
