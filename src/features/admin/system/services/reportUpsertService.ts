/**
 * Report Upsert Service
 * Enforces single report per investor per period rule
 * Logs changes to report_change_log for audit trail
 */

import { supabase } from "@/integrations/supabase/client";
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
 * NOTE: generated_reports table was dropped - always returns false
 */
export async function checkReportExists(
  _investorId: string,
  _fundId: string | null,
  _reportMonth: string
): Promise<ReportExistsResult> {
  return { exists: false };
}

/**
 * Log a report change to the audit trail
 * NOTE: report_change_log table was dropped - no-op
 */
async function logReportChange(
  _reportId: string,
  _reportTable: "generated_statements" | "generated_reports",
  _changedBy: string,
  _previousHtmlHash?: string,
  _previousPdfUrl?: string,
  _changeReason?: string,
  _changeSummary?: Record<string, any>
): Promise<void> {
  // report_change_log table was dropped - no-op
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

  // generated_reports table was dropped
  throw new Error("generated_reports table has been removed - use generated_statements instead");
}

/**
 * Get report change history
 * NOTE: report_change_log table was dropped - returns empty
 */
export async function getReportChangeHistory(
  _reportId: string,
  _reportTable: "generated_statements" | "generated_reports"
): Promise<any[]> {
  return [];
}
