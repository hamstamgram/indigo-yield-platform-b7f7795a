import { supabase } from "@/integrations/supabase/client";
import { GenerateReportRequest, GenerateReportResponse } from "@/types/reports";

// Lazy load PDF/Excel generators to reduce initial bundle size
const loadPDFGenerator = () => import("./pdfGenerator");
const loadExcelGenerator = () => import("./excelGenerator");

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

      // 2. Generate File (lazy load to reduce bundle size)
      let result;
      if (req.format === "pdf") {
        const { generatePDFReport } = await loadPDFGenerator();
        result = await generatePDFReport(reportData, {
          includeCharts: req.parameters?.includeCharts,
          confidential: req.parameters?.confidential,
        });
      } else if (req.format === "excel") {
        const { generateExcelReport } = await loadExcelGenerator();
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

    // userId IS the investorId (One ID)
    const investorId = userId;

    // Fetch basic data
    // Use investor_positions (new table)
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

    // Use investor_fund_performance (V2) for statements with investor_id
    // Cast to any to avoid "Type instantiation is excessively deep" error
    const { data: performanceStatements } = await (supabase as any)
      .from("investor_fund_performance")
      .select(`
        *,
        period:statement_periods(period_end_date, year, month)
      `)
      .eq("investor_id", investorId)
      .gte("period.period_end_date", startDate.toISOString().split('T')[0])
      .lte("period.period_end_date", endDate.toISOString().split('T')[0])
      .order("period(period_end_date)", { ascending: false })
      .limit(12); // Limit to last 12 months for report

    // Map V2 performance data to legacy statements structure for compatibility
    const statements = performanceStatements?.map((r: any) => ({
      id: r.id,
      investor_id: r.investor_id,
      report_month: r.period?.period_end_date,
      asset_code: r.fund_name,
      opening_balance: Number(r.mtd_beginning_balance || 0),
      closing_balance: Number(r.mtd_ending_balance || 0),
      additions: Number(r.mtd_additions || 0),
      withdrawals: Number(r.mtd_redemptions || 0),
      yield_earned: Number(r.mtd_net_income || 0),
      rate_of_return: Number(r.mtd_rate_of_return || 0),
    })) || [];


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
