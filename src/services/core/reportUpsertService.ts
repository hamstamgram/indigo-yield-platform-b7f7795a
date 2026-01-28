/**
 * Report Upsert Service
 * Enforces single report per investor per period rule
 * Logs changes to report_change_log for audit trail
 */

import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db/index";
import { logError } from "@/lib/logger";

export interface ExistingReport {
  id: string;
  investor_id: string;
  period_id?: string;
  fund_id?: string;
  report_month?: string;
  html_content?: string;
  pdf_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface ReportExistsResult {
  exists: boolean;
  report?: ExistingReport;
}

/**
 * Check if a statement already exists for an investor + period
 */
export async function checkStatementExists(
  investorId: string,
  periodId: string
): Promise<ReportExistsResult> {
  const { data, error } = await supabase
    .from("generated_statements")
    .select("id, investor_id, period_id, html_content, pdf_url, created_at")
    .eq("investor_id", investorId)
    .eq("period_id", periodId)
    .maybeSingle();

  if (error) {
    logError("checkStatementExists", error, { investorId, periodId });
    return { exists: false };
  }

  return {
    exists: !!data,
    report: data as ExistingReport | undefined,
  };
}

/**
 * Check if a report already exists for an investor + fund + month
 */
export async function checkReportExists(
  investorId: string,
  fundId: string | null,
  reportMonth: string
): Promise<ReportExistsResult> {
  let query = supabase
    .from("generated_reports")
    .select("id, investor_id, fund_id, report_month, html_content, pdf_url, created_at, updated_at")
    .eq("investor_id", investorId)
    .eq("report_month", reportMonth);

  if (fundId) {
    query = query.eq("fund_id", fundId);
  } else {
    query = query.is("fund_id", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    logError("checkReportExists", error, { investorId, fundId, reportMonth });
    return { exists: false };
  }

  return {
    exists: !!data,
    report: data as ExistingReport | undefined,
  };
}

/**
 * Log a report change to the audit trail
 */
async function logReportChange(
  reportId: string,
  reportTable: "generated_statements" | "generated_reports",
  changedBy: string,
  previousHtmlHash?: string,
  previousPdfUrl?: string,
  changeReason?: string,
  changeSummary?: Record<string, any>
): Promise<void> {
  const { success, error } = await db.insert("report_change_log", {
    report_id: reportId,
    report_table: reportTable,
    changed_by: changedBy,
    previous_html_hash: previousHtmlHash,
    previous_pdf_url: previousPdfUrl,
    change_reason: changeReason || "Report regenerated",
    change_summary: changeSummary,
  });

  if (!success) {
    logError("logReportChange", error, { reportId, reportTable });
    // Don't throw - audit logging should not block report generation
  }
}

/**
 * Simple hash function for HTML content comparison
 */
function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * Custom error class for duplicate report attempts
 */
export class DuplicateStatementError extends Error {
  public readonly existingReportId: string;
  public readonly investorId: string;
  public readonly periodId: string;
  public readonly createdAt: string;

  constructor(existingReport: ExistingReport, investorId: string, periodId: string) {
    super(
      `Statement already exists for investor ${investorId} and period ${periodId}. Created at: ${existingReport.created_at}`
    );
    this.name = "DuplicateStatementError";
    this.existingReportId = existingReport.id;
    this.investorId = investorId;
    this.periodId = periodId;
    this.createdAt = existingReport.created_at;
  }
}

/**
 * STRICT Insert: Creates a new statement ONLY if none exists.
 * REJECTS with DuplicateStatementError if statement already exists.
 * This is the preferred method for enforcing one-report-per-period rule.
 */
export async function strictInsertStatement(
  investorId: string,
  periodId: string,
  userId: string,
  htmlContent: string,
  pdfUrl: string | null,
  fundNames: string[],
  generatedBy: string
): Promise<{ reportId: string; isNew: true }> {
  // Check if statement already exists
  const existing = await checkStatementExists(investorId, periodId);

  if (existing.exists && existing.report) {
    // REJECT - do not update, throw error
    throw new DuplicateStatementError(existing.report, investorId, periodId);
  }

  // Create new statement
  const { data, error } = await supabase
    .from("generated_statements")
    .insert({
      investor_id: investorId,
      period_id: periodId,
      user_id: userId,
      html_content: htmlContent,
      pdf_url: pdfUrl,
      fund_names: fundNames,
      generated_by: generatedBy,
    })
    .select("id")
    .single();

  if (error) {
    // Handle unique constraint violation as well
    if (error.code === "23505") {
      const checkAgain = await checkStatementExists(investorId, periodId);
      if (checkAgain.exists && checkAgain.report) {
        throw new DuplicateStatementError(checkAgain.report, investorId, periodId);
      }
    }
    throw new Error(`Failed to create statement: ${error.message}`);
  }

  return { reportId: data.id, isNew: true };
}

/**
 * Upsert a generated statement (creates or updates existing)
 * Returns the report ID and whether it was an update
 *
 * @deprecated Use strictInsertStatement instead to enforce one-report-per-period rule.
 * This function is kept for backward compatibility but should not be used for new code.
 */
export async function upsertStatement(
  investorId: string,
  periodId: string,
  userId: string,
  htmlContent: string,
  pdfUrl: string | null,
  fundNames: string[],
  generatedBy: string
): Promise<{ reportId: string; wasUpdate: boolean }> {
  // Check if statement already exists
  const existing = await checkStatementExists(investorId, periodId);

  if (existing.exists && existing.report) {
    // Log the change before updating
    await logReportChange(
      existing.report.id,
      "generated_statements",
      generatedBy,
      existing.report.html_content ? simpleHash(existing.report.html_content) : undefined,
      existing.report.pdf_url || undefined,
      "Statement regenerated",
      {
        previous_created_at: existing.report.created_at,
        regenerated_at: new Date().toISOString(),
      }
    );

    // Update existing statement (same ID)
    const { error } = await supabase
      .from("generated_statements")
      .update({
        html_content: htmlContent,
        pdf_url: pdfUrl,
        fund_names: fundNames,
        generated_by: generatedBy,
        // Note: created_at stays the same, only content updates
      })
      .eq("id", existing.report.id);

    if (error) {
      throw new Error(`Failed to update statement: ${error.message}`);
    }

    return { reportId: existing.report.id, wasUpdate: true };
  }

  // Create new statement
  const { data, error } = await supabase
    .from("generated_statements")
    .insert({
      investor_id: investorId,
      period_id: periodId,
      user_id: userId,
      html_content: htmlContent,
      pdf_url: pdfUrl,
      fund_names: fundNames,
      generated_by: generatedBy,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create statement: ${error.message}`);
  }

  return { reportId: data.id, wasUpdate: false };
}

/**
 * Upsert a generated report (creates or updates existing)
 * Returns the report ID and whether it was an update
 */
export async function upsertReport(
  investorId: string,
  fundId: string | null,
  reportMonth: string,
  reportType: string,
  reportName: string,
  htmlContent: string | null,
  pdfUrl: string | null,
  reportData: Record<string, any> | null,
  createdBy: string,
  status: string = "DRAFT"
): Promise<{ reportId: string; wasUpdate: boolean }> {
  // Check if report already exists
  const existing = await checkReportExists(investorId, fundId, reportMonth);

  if (existing.exists && existing.report) {
    // Log the change before updating
    await logReportChange(
      existing.report.id,
      "generated_reports",
      createdBy,
      existing.report.html_content ? simpleHash(existing.report.html_content) : undefined,
      existing.report.pdf_url || undefined,
      "Report regenerated",
      {
        previous_created_at: existing.report.created_at,
        previous_updated_at: existing.report.updated_at,
        regenerated_at: new Date().toISOString(),
      }
    );

    // Update existing report (same ID)
    const { error } = await supabase
      .from("generated_reports")
      .update({
        report_type: reportType,
        report_name: reportName,
        html_content: htmlContent,
        pdf_url: pdfUrl,
        report_data: reportData,
        created_by: createdBy,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.report.id);

    if (error) {
      throw new Error(`Failed to update report: ${error.message}`);
    }

    return { reportId: existing.report.id, wasUpdate: true };
  }

  // Create new report
  const { data, error } = await supabase
    .from("generated_reports")
    .insert({
      investor_id: investorId,
      fund_id: fundId,
      report_month: reportMonth,
      report_type: reportType,
      report_name: reportName,
      html_content: htmlContent,
      pdf_url: pdfUrl,
      report_data: reportData,
      created_by: createdBy,
      status,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create report: ${error.message}`);
  }

  return { reportId: data.id, wasUpdate: false };
}

/**
 * Get report change history
 */
export async function getReportChangeHistory(
  reportId: string,
  reportTable: "generated_statements" | "generated_reports"
): Promise<any[]> {
  const { data, error } = await supabase
    .from("report_change_log")
    .select("*")
    .eq("report_id", reportId)
    .eq("report_table", reportTable)
    .order("changed_at", { ascending: false });

  if (error) {
    logError("getReportChangeHistory", error, { reportId, reportTable });
    return [];
  }

  return data || [];
}
