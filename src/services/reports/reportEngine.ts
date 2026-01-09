import { supabase } from "@/integrations/supabase/client";
import { reportService } from "@/services";
import { GenerateReportRequest, GenerateReportResponse } from "@/types/domains";

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
      const userId = req.userId || (await supabase.auth.getUser()).data.user?.id || "";
      
      const reportData = await this.fetchReportData(
        userId,
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
        reportId: req.reportId,
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
   * Fetch report data from database using service layer
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
    const dateRange = { start: startDate, end: endDate };

    // Fetch data using service layer
    const [positions, transactions, performanceStatements] = await Promise.all([
      reportService.getInvestorPositions(investorId),
      reportService.getInvestorTransactions(investorId, dateRange),
      reportService.getInvestorPerformanceStatements(investorId, dateRange),
    ]);

    // Map V2 performance data to legacy statements structure for compatibility
    const statements = performanceStatements.map((r: any) => ({
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
    }));

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
        totalValue: positions.reduce((sum, p) => sum + Number(p.current_value), 0),
        positionCount: positions.length,
        transactionCount: transactions.length,
      },
      holdings: positions.map((p: any) => ({
        asset: p.funds?.asset || "UNK",
        amount: p.shares,
        value: p.current_value,
        fundName: p.funds?.name,
      })),
      transactions: transactions.map((tx: any) => ({
        date: tx.tx_date,
        type: tx.type,
        assetCode: tx.asset,
        amount: Number(tx.amount) || 0,
        value: Number(tx.amount) || 0, // For reports, value is typically same as amount
        is_voided: tx.is_voided || false,
        note: tx.notes || undefined,
        txHash: tx.tx_hash || undefined,
      })),
      statements,
    };
  }
}
