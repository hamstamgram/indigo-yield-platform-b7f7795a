// @ts-nocheck
/**
 * Reports API Service
 * Handles all report-related API calls
 */

import { supabase } from '@/integrations/supabase/client';
import {
  ReportEngineLazy,
  generatePDFReportLazy,
  generateExcelReportLazy
} from './reportsApi.lazy';
import {
  ReportType,
  ReportFormat,
  ReportStatus,
  ReportFilters,
  ReportParameters,
  GenerateReportRequest,
  GenerateReportResponse,
  DownloadReportRequest,
  DownloadReportResponse,
  GeneratedReport,
  ReportSchedule,
  ReportDefinition,
  ReportStatistics,
  ReportScheduleFrequency,
} from '@/types/reports';

export class ReportsApi {
  /**
   * Get available report definitions
   */
  static async getReportDefinitions(
    includeAdminOnly: boolean = false
  ): Promise<ReportDefinition[]> {
    try {
      let query = supabase
        .from('report_definitions')
        .select('*')
        .eq('is_active', true)
        .order('report_type');

      if (!includeAdminOnly) {
        query = query.eq('is_admin_only', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(this.mapReportDefinition);
    } catch (error) {
      console.error('Failed to fetch report definitions:', error);
      return [];
    }
  }

  /**
   * Get single report definition
   */
  static async getReportDefinition(
    reportType: ReportType
  ): Promise<ReportDefinition | null> {
    try {
      const { data, error } = await supabase
        .from('report_definitions')
        .select('*')
        .eq('report_type', reportType)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return data ? this.mapReportDefinition(data) : null;
    } catch (error) {
      console.error('Failed to fetch report definition:', error);
      return null;
    }
  }

  /**
   * Generate a report
   */
  static async generateReport(
    request: GenerateReportRequest
  ): Promise<GenerateReportResponse> {
    try {
      // Use lazy-loaded ReportEngine to handle generation
      return await ReportEngineLazy.generateReport(request);
    } catch (error) {
      console.error('Report generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
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
        return { success: false, error: 'User not authenticated' };
      }

      // Fetch report data (lazy loaded)
      const reportData = await ReportEngineLazy.fetchReportData(
        request.reportType,
        request.filters || {},
        request.parameters || {},
        user.id
      );

      // Generate based on format (all lazy loaded)
      if (request.format === 'pdf') {
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
      } else if (request.format === 'excel') {
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
      } else if (request.format === 'json') {
        // Return JSON data
        const jsonData = JSON.stringify(reportData, null, 2);
        const encoder = new TextEncoder();
        return {
          success: true,
          data: encoder.encode(jsonData),
          filename: `report_${Date.now()}.json`,
        };
      } else if (request.format === 'csv') {
        // Generate CSV (simplified, transactions only)
        const csv = this.generateCSV(reportData);
        const encoder = new TextEncoder();
        return {
          success: true,
          data: encoder.encode(csv),
          filename: `report_${Date.now()}.csv`,
        };
      }

      return { success: false, error: 'Unsupported format' };
    } catch (error) {
      console.error('Immediate report generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user's generated reports
   */
  static async getUserReports(
    filters?: {
      reportType?: ReportType;
      status?: ReportStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<GeneratedReport[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_user_reports', {
        p_user_id: user.id,
        p_report_type: filters?.reportType || null,
        p_status: filters?.status || null,
        p_limit: filters?.limit || 50,
        p_offset: filters?.offset || 0,
      });

      if (error) throw error;

      return (data || []).map(this.mapGeneratedReport);
    } catch (error) {
      console.error('Failed to fetch user reports:', error);
      return [];
    }
  }

  /**
   * Get single generated report
   */
  static async getReport(reportId: string): Promise<GeneratedReport | null> {
    try {
      const { data, error } = await supabase
        .from('generated_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) throw error;

      return data ? this.mapGeneratedReport(data) : null;
    } catch (error) {
      console.error('Failed to fetch report:', error);
      return null;
    }
  }

  /**
   * Download a generated report
   */
  static async downloadReport(
    request: DownloadReportRequest
  ): Promise<DownloadReportResponse> {
    try {
      const report = await this.getReport(request.reportId);
      if (!report) {
        return { success: false, error: 'Report not found' };
      }

      if (report.status !== 'completed') {
        return { success: false, error: 'Report not ready for download' };
      }

      if (!report.storagePath) {
        return { success: false, error: 'Report file not available' };
      }

      // Get download URL from Supabase Storage
      const { data, error } = await supabase.storage
        .from('reports')
        .createSignedUrl(report.storagePath, 3600); // 1 hour expiry

      if (error) throw error;

      // Update download count
      await supabase
        .from('generated_reports')
        .update({ download_count: report.downloadCount + 1 })
        .eq('id', request.reportId);

      // Log access
      await this.logReportAccess(request.reportId, 'download');

      return {
        success: true,
        downloadUrl: data.signedUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        fileName: report.storagePath.split('/').pop(),
        fileSizeBytes: report.fileSizeBytes || undefined,
      };
    } catch (error) {
      console.error('Report download failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a generated report
   */
  static async deleteReport(reportId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const report = await this.getReport(reportId);
      if (!report) {
        return { success: false, error: 'Report not found' };
      }

      // Delete from storage if exists
      if (report.storagePath) {
        await supabase.storage.from('reports').remove([report.storagePath]);
      }

      // Delete record
      const { error } = await supabase
        .from('generated_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      // Log access
      await this.logReportAccess(reportId, 'delete');

      return { success: true };
    } catch (error) {
      console.error('Report deletion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get report schedules
   */
  static async getReportSchedules(): Promise<ReportSchedule[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('report_schedules')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapReportSchedule);
    } catch (error) {
      console.error('Failed to fetch report schedules:', error);
      return [];
    }
  }

  /**
   * Create report schedule
   */
  static async createReportSchedule(
    schedule: Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<{ success: boolean; schedule?: ReportSchedule; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('report_schedules')
        .insert({
          report_definition_id: schedule.reportDefinitionId,
          name: schedule.name,
          description: schedule.description,
          frequency: schedule.frequency,
          day_of_week: schedule.dayOfWeek,
          day_of_month: schedule.dayOfMonth,
          time_of_day: schedule.timeOfDay,
          timezone: schedule.timezone,
          recipient_user_ids: schedule.recipientUserIds,
          recipient_emails: schedule.recipientEmails,
          delivery_method: schedule.deliveryMethod,
          parameters: schedule.parameters,
          filters: schedule.filters,
          formats: schedule.formats,
          is_active: schedule.isActive,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        schedule: data ? this.mapReportSchedule(data) : undefined,
      };
    } catch (error) {
      console.error('Failed to create report schedule:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update report schedule
   */
  static async updateReportSchedule(
    scheduleId: string,
    updates: Partial<ReportSchedule>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('report_schedules')
        .update({
          name: updates.name,
          description: updates.description,
          frequency: updates.frequency,
          day_of_week: updates.dayOfWeek,
          day_of_month: updates.dayOfMonth,
          time_of_day: updates.timeOfDay,
          timezone: updates.timezone,
          recipient_user_ids: updates.recipientUserIds,
          recipient_emails: updates.recipientEmails,
          delivery_method: updates.deliveryMethod,
          parameters: updates.parameters,
          filters: updates.filters,
          formats: updates.formats,
          is_active: updates.isActive,
        })
        .eq('id', scheduleId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Failed to update report schedule:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete report schedule
   */
  static async deleteReportSchedule(
    scheduleId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('report_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Failed to delete report schedule:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get report statistics
   */
  static async getReportStatistics(
    daysBack: number = 30
  ): Promise<ReportStatistics[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_report_statistics', {
        p_user_id: user.id,
        p_days_back: daysBack,
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to fetch report statistics:', error);
      return [];
    }
  }

  /**
   * Log report access
   */
  private static async logReportAccess(
    reportId: string,
    action: 'view' | 'download' | 'delete' | 'share'
  ): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from('report_access_logs').insert({
        report_id: reportId,
        user_id: user?.id || null,
        action,
        metadata: {},
      });
    } catch (error) {
      console.error('Failed to log report access:', error);
    }
  }

  /**
   * Helper: Generate CSV from report data
   */
  private static generateCSV(data: Record<string, unknown>): string {
    const lines: string[] = [];

    // Add header
    if (data.transactions && Array.isArray(data.transactions) && data.transactions.length > 0) {
      lines.push('Date,Type,Asset,Amount,Value,Status');

      data.transactions.forEach((tx: Record<string, unknown>) => {
        lines.push(
          `${tx.date},${tx.type},${tx.assetCode},${tx.amount},${tx.value},${tx.status}`
        );
      });
    }

    return lines.join('\n');
  }

  /**
   * Mapping helpers
   */

  private static mapReportDefinition(data: Record<string, unknown>): ReportDefinition {
    return {
      id: data.id,
      reportType: data.report_type,
      name: data.name,
      description: data.description,
      templateConfig: data.template_config,
      defaultFilters: data.default_filters,
      availableFormats: data.available_formats,
      isAdminOnly: data.is_admin_only,
      isActive: data.is_active,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private static mapGeneratedReport(data: Record<string, unknown>): GeneratedReport {
    return {
      id: data.id,
      reportDefinitionId: data.report_definition_id,
      reportType: data.report_type,
      format: data.format,
      status: data.status,
      generatedForUserId: data.generated_for_user_id,
      generatedByUserId: data.generated_by_user_id,
      parameters: data.parameters,
      filters: data.filters,
      dateRangeStart: data.date_range_start,
      dateRangeEnd: data.date_range_end,
      storagePath: data.storage_path,
      fileSizeBytes: data.file_size_bytes,
      pageCount: data.page_count,
      downloadUrl: data.download_url,
      downloadUrlExpiresAt: data.download_url_expires_at,
      downloadCount: data.download_count,
      processingStartedAt: data.processing_started_at,
      processingCompletedAt: data.processing_completed_at,
      processingDurationMs: data.processing_duration_ms,
      errorMessage: data.error_message,
      errorDetails: data.error_details,
      scheduleId: data.schedule_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private static mapReportSchedule(data: Record<string, unknown>): ReportSchedule {
    return {
      id: data.id,
      reportDefinitionId: data.report_definition_id,
      name: data.name,
      description: data.description,
      frequency: data.frequency,
      dayOfWeek: data.day_of_week,
      dayOfMonth: data.day_of_month,
      timeOfDay: data.time_of_day,
      timezone: data.timezone,
      recipientUserIds: data.recipient_user_ids,
      recipientEmails: data.recipient_emails,
      deliveryMethod: data.delivery_method,
      parameters: data.parameters,
      filters: data.filters,
      formats: data.formats,
      isActive: data.is_active,
      lastRunAt: data.last_run_at,
      nextRunAt: data.next_run_at,
      lastRunStatus: data.last_run_status,
      runCount: data.run_count,
      failureCount: data.failure_count,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
