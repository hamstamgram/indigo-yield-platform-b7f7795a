import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import {
  ReportEngineLazy,
  generatePDFReportLazy,
  generateExcelReportLazy,
} from "./reportsApi.lazy";
import {
  ReportType,
  ReportStatus,
  ReportFormat,
  ReportParameter,
  ReportFilter,
  ReportFrequency,
  DeliveryMethod,
  GenerateReportRequest,
  GenerateReportResponse,
  DownloadReportRequest,
  DownloadReportResponse,
  GeneratedReport,
  ReportSchedule,
  ReportDefinition,
  ReportStatistics,
} from "@/types/domains";

export class ReportsApi {
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
   */
  static async getUserReports(filters?: {
    reportType?: ReportType;
    status?: ReportStatus;
    limit?: number;
    offset?: number;
  }): Promise<GeneratedReport[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from("generated_reports")
      .select("*")
      .eq("investor_id", user.id)
      .order("created_at", { ascending: false });

    if (filters?.reportType) {
      query = query.eq("report_type", filters.reportType);
    }

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching user reports:", error);
      return [];
    }

    return (data || []).map(this.mapGeneratedReport);
  }

  /**
   * Get single generated report
   */
  static async getReport(reportId: string): Promise<GeneratedReport | null> {
    const { data, error } = await supabase
      .from("generated_reports")
      .select("*")
      .eq("id", reportId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching report:", error);
      return null;
    }

    if (!data) return null;

    return this.mapGeneratedReport(data);
  }

  /**
   * Download a generated report
   */
  static async downloadReport(request: DownloadReportRequest): Promise<DownloadReportResponse> {
    try {
      const report = await this.getReport(request.reportId);
      if (!report) return { success: false, error: "Report not found" };

      if (!report.storagePath) return { success: false, error: "Report file not found" };

      const { data, error } = await supabase.storage
        .from("reports") // Assuming 'reports' bucket exists
        .download(report.storagePath);

      if (error) throw error;

      return {
        success: true,
        data: new Uint8Array(await data.arrayBuffer()),
        fileName: `${report.reportName}.${report.format}`,
        contentType: data.type,
      };
    } catch (error) {
      console.error("Error downloading report:", error);
      return { success: false, error: "Failed to download report" };
    }
  }

  /**
   * Delete a generated report
   */
  static async deleteReport(reportId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { success, error } = await db.delete("generated_reports", {
        column: "id",
        value: reportId,
      });

      if (!success) {
        return {
          success: false,
          error: error?.userMessage || "Failed to delete report",
        };
      }
      return { success: true };
    } catch (error) {
      console.error("Error deleting report:", error);
      return { success: false, error: "Failed to delete report" };
    }
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
        // Compute status display from is_voided
        const statusDisplay = tx.is_voided ? "Voided" : "Active";
        const notesOrStatus = tx.notes || statusDisplay;

        lines.push(
          `${tx.tx_date},${tx.type},${tx.asset},${tx.amount},${tx.value_date},${notesOrStatus}`
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
      templateConfig: (data.template_config || {}) as Record<string, unknown>,
      defaultFilters: (data.default_filters || {}) as ReportFilter,
      availableFormats: (data.available_formats || []) as ReportFormat[],
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
      reportName: data.report_name as string,
      format: data.format as ReportFormat,
      status: data.status as ReportStatus,
      generatedForUserId: data.generated_for_user_id as string | null,
      generatedByUserId: data.generated_by_user_id as string | null,
      parameters: (data.parameters || {}) as ReportParameter,
      filters: (data.filters || {}) as ReportFilter,
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
      errorDetails: (data.error_details || null) as Record<string, unknown> | null,
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
      frequency: data.frequency as ReportFrequency,
      dayOfWeek: data.day_of_week as number | null,
      dayOfMonth: data.day_of_month as number | null,
      timeOfDay: data.time_of_day as string,
      timezone: data.timezone as string,
      recipientUserIds: data.recipient_user_ids as string[],
      recipientEmails: data.recipient_emails as string[],
      deliveryMethod: (data.delivery_method || []) as DeliveryMethod[],
      parameters: (data.parameters || {}) as ReportParameter,
      filters: (data.filters || {}) as ReportFilter,
      formats: (data.formats || []) as ReportFormat[],
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
