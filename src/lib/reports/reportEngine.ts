import { supabase } from "@/integrations/supabase/client";
import { GenerateReportRequest, GenerateReportResponse } from "@/types/reports";
import { generatePDFReport } from "./pdfGenerator";
import { generateExcelReport } from "./excelGenerator";

export class ReportEngine {
  /**
   * Generate a report based on the request
   */
  static async generateReport(request: GenerateReportRequest): Promise<GenerateReportResponse> {
    try {
      // 1. Fetch Data
      const req = request as any;
      const reportData = await this.fetchReportData(
        req.userId || (await supabase.auth.getUser()).data.user?.id || "",
        req.reportType,
        req.filters || {},
        req.parameters || {}
      );

      // 2. Generate File
      let result;
      if (req.format === "pdf") {
        result = await generatePDFReport(reportData, {
          includeCharts: req.parameters?.includeCharts,
          confidential: req.parameters?.confidential,
        });
      } else if (req.format === "excel") {
        result = await generateExcelReport(reportData, {
          includeCharts: req.parameters?.includeCharts,
        });
      } else {
        return { success: false, error: "Unsupported format" };
      }

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // 3. Return result (caller handles storage/upload)
      return {
        success: true,
        reportId: req.reportId, // Pass back if needed
        // In a real engine, we might upload here or return the buffer
        // For now, assuming the API layer handles the buffer from result.data
      };
    } catch (error) {
      console.error("Report Engine Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Fetch report data from database
   */
  static async fetchReportData(
    userId: string,
    reportType: string,
    filters: Record<string, any>,
    parameters: Record<string, any>
  ): Promise<any> {
    const endDate = filters.dateRangeEnd ? new Date(filters.dateRangeEnd) : new Date();
    const startDate = filters.dateRangeStart
      ? new Date(filters.dateRangeStart)
      : new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    // Resolve investor_id from user_id if possible
    let investorId = userId;
    const { data: investor } = await supabase
      .from("investors")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();

    if (investor) {
      investorId = investor.id;
    }

    // Fetch basic data
    // Use investor_positions (new table) instead of positions (legacy)
    const { data: positions } = await supabase
      .from("investor_positions")
      .select("*, funds(name, code, asset)")
      .eq("investor_id", investorId);

    // Use transactions_v2 (new table)
    const { data: transactions } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("investor_id", investorId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    // Use investor_monthly_reports (new table)
    const { data: statements } = await supabase
      .from("investor_monthly_reports")
      .select("*")
      .eq("investor_id", investorId)
      .order("report_month", { ascending: false })
      .limit(12);

    // Build report data structure matching what generators expect
    return {
      title: reportType
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      generatedDate: new Date().toISOString(),
      reportPeriod: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalValue: positions?.reduce((sum, p) => sum + Number(p.current_value), 0) || 0,
        positionCount: positions?.length || 0,
        transactionCount: transactions?.length || 0,
      },
      holdings:
        positions?.map((p: any) => ({
          asset: p.funds?.asset || "UNK",
          amount: p.shares,
          value: p.current_value,
          fundName: p.funds?.name,
        })) || [],
      transactions: transactions || [],
      statements: statements || [],
    };
  }
}
