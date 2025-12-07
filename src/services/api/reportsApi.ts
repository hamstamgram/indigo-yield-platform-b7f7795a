import { supabase } from "@/integrations/supabase/client";
import {
  ReportEngineLazy,
  generatePDFReportLazy,
  generateExcelReportLazy,
} from "./reportsApi.lazy";
import {
  ReportType,
  ReportStatus,
  GenerateReportRequest,
  GenerateReportResponse,
  DownloadReportRequest,
  DownloadReportResponse,
  GeneratedReport,
  ReportSchedule,
  ReportDefinition,
  ReportStatistics,
} from "@/types/reports";

export class ReportsApi {
  /**
   * Get available report definitions
   */
  static async getReportDefinitions(
    _includeAdminOnly: boolean = false
  ): Promise<ReportDefinition[]> {
    // Note: report_definitions table doesn't exist in current schema
    // Return empty array as fallback until table is created
    console.warn("getReportDefinitions: report_definitions table not available");
    return [];
  }

  /**
   * Get single report definition
   */
  static async getReportDefinition(_reportType: ReportType): Promise<ReportDefinition | null> {
    // Note: report_definitions table doesn't exist in current schema
    console.warn("getReportDefinition: report_definitions table not available");
    return null;
  }

  /**
   * Generate a report
   */
  static async generateReport(request: GenerateReportRequest): Promise<GenerateReportResponse> {
    // Use lazy-loaded ReportEngine to handle generation
    return await ReportEngineLazy.generateReport(request);
  }

  /**
   * Generate report immediately (for download)
   * This bypasses the queue and generates the report synchronously
   */
  static async generateReportNow(
    request: GenerateReportRequest
  ): Promise<{ success: boolean; data?: Uint8Array; filename?: string; error?: string }> {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Fetch report data using the engine
      const reportData = await ReportEngineLazy.fetchReportData(
        user.id,
        request.reportType,
        request.filters || {},
        request.parameters || {}
      );

      // Generate based on format (all lazy loaded)
      if (request.format === "pdf") {
        const result = await generatePDFReportLazy(reportData, {
          includeCharts: request.parameters?.includeCharts,
          confidential: request.parameters?.confidential,
        });

        if (!result.success) {
          return { success: false, error: result.error };
        }

        return {
          success: true,
          data: result.data,
          filename: result.filename,
        };
      } else if (request.format === "excel") {
        const result = await generateExcelReportLazy(reportData, {
          includeCharts: request.parameters?.includeCharts,
        });

        if (!result.success) {
          return { success: false, error: result.error };
        }

        return {
          success: true,
          data: result.data,
          filename: result.filename,
        };
      } else if (request.format === "json") {
        // Return JSON data
        const jsonData = JSON.stringify(reportData, null, 2);
        const encoder = new TextEncoder();
        return {
          success: true,
          data: encoder.encode(jsonData),
          filename: `report_${Date.now()}.json`,
        };
      } else if (request.format === "csv") {
        // Generate CSV (simplified, transactions only)
        const csv = this.generateCSV(reportData);
        const encoder = new TextEncoder();
        return {
          success: true,
          data: encoder.encode(csv),
          filename: `report_${Date.now()}.csv`,
        };
      }

      return { success: false, error: "Unsupported format" };
    } catch (error) {
      console.error("Immediate report generation failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get user's generated reports
   * Note: get_user_reports RPC doesn't exist
   */
  static async getUserReports(_filters?: {
    reportType?: ReportType;
    status?: ReportStatus;
    limit?: number;
    offset?: number;
  }): Promise<GeneratedReport[]> {
    console.warn("getUserReports: get_user_reports RPC not available");
    return [];
  }

  /**
   * Get single generated report
   */
  static async getReport(_reportId: string): Promise<GeneratedReport | null> {
    // Note: generated_reports table doesn't exist in current schema
    console.warn("getReport: generated_reports table not available");
    return null;
  }

  /**
   * Download a generated report
   * Note: generated_reports table doesn't exist
   */
  static async downloadReport(_request: DownloadReportRequest): Promise<DownloadReportResponse> {
    console.warn("downloadReport: generated_reports table not available");
    return { success: false, error: "Report storage not available" };
  }

  /**
   * Delete a generated report
   */
  static async deleteReport(_reportId: string): Promise<{ success: boolean; error?: string }> {
    // Note: generated_reports table doesn't exist in current schema
    console.warn("deleteReport: generated_reports table not available");
    return { success: false, error: "Report storage not available" };
  }

  /**
   * Get report schedules
   */
  static async getReportSchedules(): Promise<ReportSchedule[]> {
    // Note: report_schedules table doesn't exist in current schema
    console.warn("getReportSchedules: report_schedules table not available");
    return [];
  }

  /**
   * Create report schedule
   */
  static async createReportSchedule(
    _schedule: Omit<ReportSchedule, "id" | "createdAt" | "updatedAt" | "createdBy">
  ): Promise<{ success: boolean; schedule?: ReportSchedule; error?: string }> {
    // Note: report_schedules table doesn't exist in current schema
    console.warn("createReportSchedule: report_schedules table not available");
    return { success: false, error: "Report scheduling not available" };
  }

  /**
   * Update report schedule
   */
  static async updateReportSchedule(
    _scheduleId: string,
    _updates: Partial<ReportSchedule>
  ): Promise<{ success: boolean; error?: string }> {
    // Note: report_schedules table doesn't exist in current schema
    console.warn("updateReportSchedule: report_schedules table not available");
    return { success: false, error: "Report scheduling not available" };
  }

  /**
   * Delete report schedule
   */
  static async deleteReportSchedule(
    _scheduleId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Note: report_schedules table doesn't exist in current schema
    console.warn("deleteReportSchedule: report_schedules table not available");
    return { success: false, error: "Report scheduling not available" };
  }

  /**
   * Get report statistics
   * Note: get_report_statistics RPC doesn't exist
   */
  static async getReportStatistics(_daysBack: number = 30): Promise<ReportStatistics[]> {
    console.warn("getReportStatistics: get_report_statistics RPC not available");
    return [];
  }

  /**
   * Log report access
   */
  private static async logReportAccess(
    _reportId: string,
    _action: "view" | "download" | "delete" | "share"
  ): Promise<void> {
    // Note: report_access_logs table doesn't exist in current schema
    // Silently skip logging until table is created
  }

  /**
   * Helper: Generate CSV from report data
   */
  private static generateCSV(data: Record<string, unknown>): string {
    const lines: string[] = [];

    // Add header
    if (data.transactions && Array.isArray(data.transactions) && data.transactions.length > 0) {
      lines.push("Date,Type,Asset,Amount,Value Date,Status/Notes");

      data.transactions.forEach((tx: any) => {
        lines.push(
          `${tx.tx_date},${tx.type},${tx.asset},${tx.amount},${tx.value_date},${tx.notes || tx.status || ""}`
        );
      });
    }

    return lines.join("\n");
  }

  /**
   * Mapping helpers
   */

  private static mapReportDefinition(data: Record<string, unknown>): ReportDefinition {
    return {
      id: data.id as string,
      reportType: data.report_type as ReportType,
      name: data.name as string,
      description: data.description as string | null,
      templateConfig: data.template_config as any,
      defaultFilters: data.default_filters as any,
      availableFormats: data.available_formats as any[],
      isAdminOnly: data.is_admin_only as boolean,
      isActive: data.is_active as boolean,
      createdBy: data.created_by as string | null,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }

  private static mapGeneratedReport(data: Record<string, unknown>): GeneratedReport {
    return {
      id: data.id as string,
      reportDefinitionId: data.report_definition_id as string | null,
      reportType: data.report_type as ReportType,
      format: data.format as any,
      status: data.status as ReportStatus,
      generatedForUserId: data.generated_for_user_id as string | null,
      generatedByUserId: data.generated_by_user_id as string | null,
      parameters: data.parameters as any,
      filters: data.filters as any,
      dateRangeStart: data.date_range_start as string | null,
      dateRangeEnd: data.date_range_end as string | null,
      storagePath: data.storage_path as string | null,
      fileSizeBytes: data.file_size_bytes as number | null,
      pageCount: data.page_count as number | null,
      downloadUrl: data.download_url as string | null,
      downloadUrlExpiresAt: data.download_url_expires_at as string | null,
      downloadCount: data.download_count as number,
      processingStartedAt: data.processing_started_at as string | null,
      processingCompletedAt: data.processing_completed_at as string | null,
      processingDurationMs: data.processing_duration_ms as number | null,
      errorMessage: data.error_message as string | null,
      errorDetails: data.error_details as any,
      scheduleId: data.schedule_id as string | null,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }

  private static mapReportSchedule(data: Record<string, unknown>): ReportSchedule {
    return {
      id: data.id as string,
      reportDefinitionId: data.report_definition_id as string,
      name: data.name as string,
      description: data.description as string | null,
      frequency: data.frequency as any,
      dayOfWeek: data.day_of_week as number | null,
      dayOfMonth: data.day_of_month as number | null,
      timeOfDay: data.time_of_day as string,
      timezone: data.timezone as string,
      recipientUserIds: data.recipient_user_ids as string[],
      recipientEmails: data.recipient_emails as string[],
      deliveryMethod: data.delivery_method as any[],
      parameters: data.parameters as any,
      filters: data.filters as any,
      formats: data.formats as any[],
      isActive: data.is_active as boolean,
      lastRunAt: data.last_run_at as string | null,
      nextRunAt: data.next_run_at as string | null,
      lastRunStatus: data.last_run_status as string | null,
      runCount: data.run_count as number,
      failureCount: data.failure_count as number,
      createdBy: data.created_by as string | null,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}
