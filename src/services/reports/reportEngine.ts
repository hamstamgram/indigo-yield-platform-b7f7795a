import { supabase } from "@/integrations/supabase/client";
import { reportService } from "@/services/admin";
import {
  GenerateReportRequest,
  GenerateReportResponse,
  ReportFilters,
  ReportParameters,
  ReportData,
} from "@/types/domains";
import { logError } from "@/lib/logger";

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
      const userId = request.userId || (await supabase.auth.getUser()).data.user?.id || "";

      const reportData = await this.fetchReportData(
        userId,
        request.reportType,
        request.filters || {},
        request.parameters || {}
      );

      // 2. Generate File (lazy load to reduce bundle size)
      let result;
      if (request.format === "pdf") {
        const { generatePDFReport } = await loadPDFGenerator();
        result = await generatePDFReport(reportData, {
          includeCharts: request.parameters?.includeCharts,
          confidential: request.parameters?.confidential,
        });
      } else if (request.format === "excel") {
        const { generateExcelReport } = await loadExcelGenerator();
        result = await generateExcelReport(reportData, {
          includeCharts: request.parameters?.includeCharts,
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
        reportId: request.reportId,
      };
    } catch (error) {
      logError("ReportEngine.generateReport", error);
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
    filters: ReportFilters,
    parameters: ReportParameters
  ) {
    const endDate = filters.dateRangeEnd ? new Date(filters.dateRangeEnd) : new Date();
    const startDate = filters.dateRangeStart
      ? new Date(filters.dateRangeStart)
      : new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    // userId IS the investorId (One ID)
    const investorId = userId;
    const dateRange = { start: startDate, end: endDate };
    void parameters; // reserved for future use

    // Fetch data using service layer
    const [positions, transactions] = await Promise.all([
      reportService.getInvestorPositions(investorId),
      reportService.getInvestorTransactions(investorId, dateRange),
    ]);

    // Build report data matching ReportData interface (what generators expect)
    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const totalValue = positions.reduce((sum, p) => sum + Number(p.current_value), 0);

    const reportData: ReportData = {
      title: reportType
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      generatedDate: new Date(),
      reportPeriod: `${formatDate(startDate)} to ${formatDate(endDate)}`,
      summary: {
        totalValue: String(totalValue),
      },
      holdings: positions.map((p) => {
        const funds = p.funds as { asset?: string; name?: string } | null;
        const currentValue = Number(p.current_value);
        const costBasis = Number(p.cost_basis || 0);
        const unrealizedGain = currentValue - costBasis;
        return {
          assetCode: funds?.asset || "UNK",
          assetName: funds?.name || "Unknown Fund",
          quantity: String(p.shares),
          currentPrice: "0",
          currentValue: String(currentValue),
          costBasis: String(costBasis),
          allocationPercentage:
            totalValue > 0 ? String(((currentValue / totalValue) * 100).toFixed(2)) : "0",
          unrealizedGain: String(unrealizedGain),
          unrealizedGainPercentage:
            costBasis > 0 ? String(((unrealizedGain / costBasis) * 100).toFixed(2)) : "0",
        };
      }),
      transactions: transactions.map((tx) => ({
        date: tx.tx_date,
        type: tx.type,
        assetCode: tx.asset,
        amount: String(tx.amount),
        value: String(tx.amount),
        is_voided: tx.is_voided || false,
        note: tx.notes || undefined,
        txHash: tx.tx_hash || undefined,
      })),
    };

    return reportData;
  }
}
