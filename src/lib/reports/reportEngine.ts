// @ts-nocheck
/**
 * Report Engine Core
 * Handles report generation orchestration and template processing
 */
import { supabase } from "@/integrations/supabase/client";
import {
  ReportType,
  ReportFormat,
  ReportData,
  ReportFilters,
  ReportParameters,
  GenerateReportRequest,
  GenerateReportResponse,
  ReportValidationResult,
  ReportValidationError,
  HoldingData,
  TransactionData,
  PerformanceData,
  ReportSummary,
  PerformancePeriod,
} from "@/types/reports";

export class ReportEngine {
  /**
   * Validate report generation request
   */
  static validateRequest(request: GenerateReportRequest): ReportValidationResult {
    const errors: ReportValidationError[] = [];
    const warnings: string[] = [];

    // Validate report type
    if (!request.reportType) {
      errors.push({
        field: "reportType",
        message: "Report type is required",
        code: "REQUIRED_FIELD",
      });
    }

    // Validate format
    if (!request.format) {
      errors.push({
        field: "format",
        message: "Report format is required",
        code: "REQUIRED_FIELD",
      });
    }

    // Validate date range for certain report types
    const requiresDateRange = ["transaction_history", "custom_date_range", "tax_report"];
    if (
      requiresDateRange.includes(request.reportType) &&
      (!request.filters?.dateRangeStart || !request.filters?.dateRangeEnd)
    ) {
      errors.push({
        field: "filters.dateRange",
        message: "Date range is required for this report type",
        code: "REQUIRED_DATE_RANGE",
      });
    }

    // Validate admin-only reports
    const adminOnlyReports: ReportType[] = [
      "aum_report",
      "investor_activity",
      "transaction_volume",
      "compliance_report",
      "fund_performance",
      "fee_analysis",
      "audit_trail",
    ];
    if (adminOnlyReports.includes(request.reportType)) {
      warnings.push("This report requires admin privileges");
    }

    // Validate email addresses if email delivery is requested
    if (
      request.deliveryMethod?.includes("email") &&
      (!request.recipientEmails || request.recipientEmails.length === 0)
    ) {
      errors.push({
        field: "recipientEmails",
        message: "Recipient emails required for email delivery",
        code: "REQUIRED_FIELD",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate a report
   */
  static async generateReport(request: GenerateReportRequest): Promise<GenerateReportResponse> {
    try {
      // Validate request
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.map((e) => e.message).join(", "),
        };
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Check if user has permission to generate this report type
      const hasPermission = await this.checkReportPermission(user.id, request.reportType);
      if (!hasPermission) {
        return {
          success: false,
          error: "You do not have permission to generate this report",
        };
      }

      // Create report record
      const { data: reportRecord, error: createError } = await supabase
        .from("generated_reports")
        .insert({
          report_definition_id: request.reportDefinitionId || null,
          report_type: request.reportType,
          format: request.format,
          status: "queued",
          generated_for_user_id: user.id,
          generated_by_user_id: user.id,
          parameters: request.parameters || {},
          filters: request.filters || {},
          date_range_start: request.filters?.dateRangeStart
            ? new Date(request.filters.dateRangeStart).toISOString()
            : null,
          date_range_end: request.filters?.dateRangeEnd
            ? new Date(request.filters.dateRangeEnd).toISOString()
            : null,
          schedule_id: request.scheduleId || null,
          processing_started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !reportRecord) {
        console.error("Error creating report record:", createError);
        return {
          success: false,
          error: "Failed to create report record",
        };
      }

      // Queue report generation (would typically call Edge Function)
      // For now, return success with report ID
      console.log("Report queued for generation:", reportRecord.id);

      return {
        success: true,
        reportId: reportRecord.id,
        status: "queued",
        message: "Report generation queued successfully",
        estimatedCompletionTime: this.estimateCompletionTime(request.reportType, request.format),
      };
    } catch (error) {
      console.error("Report generation failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check if user has permission to generate report type
   */
  private static async checkReportPermission(
    userId: string,
    reportType: ReportType
  ): Promise<boolean> {
    // Check if report requires admin access
    const { data: reportDef } = await supabase
      .from("report_definitions")
      .select("is_admin_only")
      .eq("report_type", reportType)
      .maybeSingle();

    if (reportDef?.is_admin_only) {
      // Check if user is admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .maybeSingle();

      return profile?.is_admin || false;
    }

    return true;
  }

  /**
   * Estimate report completion time in seconds
   */
  private static estimateCompletionTime(reportType: ReportType, format: ReportFormat): number {
    // Base time estimates (in seconds)
    const baseTime: Record<ReportFormat, number> = {
      pdf: 10,
      excel: 8,
      csv: 3,
      json: 2,
    };

    // Report complexity multiplier
    const complexityMultiplier: Partial<Record<ReportType, number>> = {
      portfolio_performance: 1.5,
      tax_report: 2.0,
      annual_summary: 2.5,
      aum_report: 1.8,
      audit_trail: 2.0,
    };

    const base = baseTime[format] || 10;
    const multiplier = complexityMultiplier[reportType] || 1.0;

    return Math.ceil(base * multiplier);
  }

  /**
   * Fetch report data based on type and filters
   */
  static async fetchReportData(
    reportType: ReportType,
    filters: ReportFilters,
    parameters: ReportParameters,
    userId: string
  ): Promise<ReportData> {
    switch (reportType) {
      case "portfolio_performance":
        return this.fetchPortfolioPerformanceData(userId, filters, parameters);
      case "transaction_history":
        return this.fetchTransactionHistoryData(userId, filters, parameters);
      case "monthly_statement":
        return this.fetchMonthlyStatementData(userId, filters, parameters);
      case "tax_report":
        return this.fetchTaxReportData(userId, filters, parameters);
      case "annual_summary":
        return this.fetchAnnualSummaryData(userId, filters, parameters);
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
  }

  /**
   * Fetch portfolio performance data
   */
  private static async fetchPortfolioPerformanceData(
    userId: string,
    filters: ReportFilters,
    parameters: ReportParameters
  ): Promise<ReportData> {
    const endDate = filters.dateRangeEnd ? new Date(filters.dateRangeEnd) : new Date();
    const startDate = filters.dateRangeStart
      ? new Date(filters.dateRangeStart)
      : new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    // Fetch investor profile
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

    // Fetch current positions
    const { data: positions } = await supabase
      .from("positions")
      .select("*")
      .eq("investor_id", userId);

    // Fetch transactions in period
    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("investor_id", userId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: true });

    // Fetch statements for performance calculations
    const { data: statements } = await supabase
      .from("statements")
      .select("*")
      .eq("investor_id", userId)
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false })
      .limit(12);

    // Calculate holdings
    const holdings: HoldingData[] =
      positions?.map((pos) => ({
        assetCode: pos.asset_code,
        assetName: pos.asset_code,
        quantity: new Decimal(pos.current_balance).toNumber(),
        currentPrice: 1, // Would fetch from asset_prices
        currentValue: new Decimal(pos.current_balance).toNumber(),
        costBasis: new Decimal(pos.principal).toNumber(),
        unrealizedGain: new Decimal(pos.total_earned).toNumber(),
        unrealizedGainPercentage: new Decimal(pos.total_earned)
          .div(pos.principal || 1)
          .mul(100)
          .toNumber(),
        allocationPercentage: 0, // Calculate after summing all positions
      })) || [];

    // Calculate total value and allocation percentages
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    holdings.forEach((h) => {
      h.allocationPercentage = (h.currentValue / totalValue) * 100;
    });

    // Calculate summary
    const summary: ReportSummary = {
      totalValue,
      beginningBalance: statements?.[0]?.begin_balance
        ? new Decimal(statements[0].begin_balance).toNumber()
        : 0,
      endingBalance: statements?.[0]?.end_balance
        ? new Decimal(statements[0].end_balance).toNumber()
        : totalValue,
      totalDeposits:
        transactions
          ?.filter((t) => t.type === "DEPOSIT")
          .reduce((sum, t) => sum + new Decimal(t.amount).toNumber(), 0) || 0,
      totalWithdrawals:
        transactions
          ?.filter((t) => t.type === "WITHDRAWAL")
          .reduce((sum, t) => sum + new Decimal(t.amount).toNumber(), 0) || 0,
      totalFees:
        transactions
          ?.filter((t) => t.type === "FEE")
          .reduce((sum, t) => sum + new Decimal(t.amount).toNumber(), 0) || 0,
      netIncome:
        transactions
          ?.filter((t) => t.type === "INTEREST")
          .reduce((sum, t) => sum + new Decimal(t.amount).toNumber(), 0) || 0,
      mtdReturn: statements?.[0]?.rate_of_return_mtd
        ? new Decimal(statements[0].rate_of_return_mtd).toNumber()
        : 0,
      qtdReturn: statements?.[0]?.rate_of_return_qtd
        ? new Decimal(statements[0].rate_of_return_qtd).toNumber()
        : 0,
      ytdReturn: statements?.[0]?.rate_of_return_ytd
        ? new Decimal(statements[0].rate_of_return_ytd).toNumber()
        : 0,
      itdReturn: statements?.[0]?.rate_of_return_itd
        ? new Decimal(statements[0].rate_of_return_itd).toNumber()
        : 0,
    };

    summary.totalReturn =
      (summary.endingBalance || 0) -
      (summary.beginningBalance || 0) +
      (summary.totalWithdrawals || 0) -
      (summary.totalDeposits || 0);
    summary.returnPercentage = ((summary.totalReturn || 0) / (summary.beginningBalance || 1)) * 100;

    // Build performance data
    const performance: PerformanceData = {
      periods: this.calculatePerformancePeriods(statements || []),
    };

    return {
      title: "Portfolio Performance Report",
      subtitle: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      generatedDate: new Date(),
      reportPeriod: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      investor: {
        id: userId,
        name: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim(),
        email: profile?.email || "",
      },
      platform: {
        name: "Indigo Yield Platform",
        website: "https://indigo.yield",
      },
      summary,
      holdings,
      transactions: this.formatTransactions(transactions || []),
      performance,
    };
  }

  /**
   * Fetch transaction history data
   */
  private static async fetchTransactionHistoryData(
    userId: string,
    filters: ReportFilters,
    parameters: ReportParameters
  ): Promise<ReportData> {
    const endDate = filters.dateRangeEnd ? new Date(filters.dateRangeEnd) : new Date();
    const startDate = filters.dateRangeStart
      ? new Date(filters.dateRangeStart)
      : new Date(endDate.getFullYear(), 0, 1);

    // Fetch transactions
    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("investor_id", userId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    const formattedTransactions = this.formatTransactions(transactions || []);

    // Calculate summary
    const summary: ReportSummary = {
      totalDeposits: formattedTransactions
        .filter((t) => t.type === "DEPOSIT")
        .reduce((sum, t) => sum + t.value, 0),
      totalWithdrawals: formattedTransactions
        .filter((t) => t.type === "WITHDRAWAL")
        .reduce((sum, t) => sum + Math.abs(t.value), 0),
      totalFees: formattedTransactions
        .filter((t) => t.type === "FEE")
        .reduce((sum, t) => sum + Math.abs(t.value), 0),
      netIncome: formattedTransactions
        .filter((t) => t.type === "INTEREST")
        .reduce((sum, t) => sum + t.value, 0),
    };

    return {
      title: "Transaction History Report",
      subtitle: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      generatedDate: new Date(),
      reportPeriod: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      summary,
      transactions: formattedTransactions,
    };
  }

  /**
   * Fetch monthly statement data
   */
  private static async fetchMonthlyStatementData(
    userId: string,
    filters: ReportFilters,
    parameters: ReportParameters
  ): Promise<ReportData> {
    // Use current month if not specified
    const targetDate = filters.dateRangeEnd ? new Date(filters.dateRangeEnd) : new Date();
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;

    // Fetch statement
    const { data: statement } = await supabase
      .from("statements")
      .select("*")
      .eq("investor_id", userId)
      .eq("period_year", year)
      .eq("period_month", month)
      .maybeSingle();

    // Fetch transactions for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("investor_id", userId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: true });

    const summary: ReportSummary = statement
      ? {
          beginningBalance: new Decimal(statement.begin_balance).toNumber(),
          endingBalance: new Decimal(statement.end_balance).toNumber(),
          totalDeposits: new Decimal(statement.additions).toNumber(),
          totalWithdrawals: new Decimal(statement.redemptions).toNumber(),
          netIncome: new Decimal(statement.net_income).toNumber(),
          mtdReturn: statement.rate_of_return_mtd
            ? new Decimal(statement.rate_of_return_mtd).toNumber()
            : undefined,
          qtdReturn: statement.rate_of_return_qtd
            ? new Decimal(statement.rate_of_return_qtd).toNumber()
            : undefined,
          ytdReturn: statement.rate_of_return_ytd
            ? new Decimal(statement.rate_of_return_ytd).toNumber()
            : undefined,
          itdReturn: statement.rate_of_return_itd
            ? new Decimal(statement.rate_of_return_itd).toNumber()
            : undefined,
        }
      : {};

    return {
      title: "Monthly Statement",
      subtitle: `${new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
      generatedDate: new Date(),
      reportPeriod: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      summary,
      transactions: this.formatTransactions(transactions || []),
    };
  }

  /**
   * Fetch tax report data
   */
  private static async fetchTaxReportData(
    userId: string,
    filters: ReportFilters,
    parameters: ReportParameters
  ): Promise<ReportData> {
    const year = filters.dateRangeEnd
      ? new Date(filters.dateRangeEnd).getFullYear()
      : new Date().getFullYear();

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    // Fetch all transactions for the year
    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("investor_id", userId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: true });

    // Fetch fees for the year
    const { data: fees } = await supabase
      .from("fees")
      .select("*")
      .eq("investor_id", userId)
      .eq("period_year", year);

    const interestIncome =
      transactions
        ?.filter((t) => t.type === "INTEREST")
        .reduce((sum, t) => sum + new Decimal(t.amount).toNumber(), 0) || 0;

    const totalFees = fees?.reduce((sum, f) => sum + new Decimal(f.amount).toNumber(), 0) || 0;

    const summary: ReportSummary = {
      netIncome: interestIncome,
      totalFees: totalFees,
    };

    return {
      title: `Tax Report - Form 1099`,
      subtitle: `Tax Year ${year}`,
      generatedDate: new Date(),
      reportPeriod: `${year}`,
      summary,
      transactions: this.formatTransactions(
        transactions?.filter((t) => t.type === "INTEREST") || []
      ),
      fees:
        fees?.map((f) => ({
          feeType: f.kind,
          period: `${f.period_year}-${String(f.period_month).padStart(2, "0")}`,
          amount: new Decimal(f.amount).toNumber(),
          assetCode: f.asset_code,
          rate: 0,
        })) || [],
    };
  }

  /**
   * Fetch annual summary data
   */
  private static async fetchAnnualSummaryData(
    userId: string,
    filters: ReportFilters,
    parameters: ReportParameters
  ): Promise<ReportData> {
    const year = filters.dateRangeEnd
      ? new Date(filters.dateRangeEnd).getFullYear()
      : new Date().getFullYear();

    // Fetch statements for the year
    const { data: statements } = await supabase
      .from("statements")
      .select("*")
      .eq("investor_id", userId)
      .eq("period_year", year)
      .order("period_month", { ascending: true });

    // Calculate yearly summary
    const beginningBalance = statements?.[0]?.begin_balance
      ? new Decimal(statements[0].begin_balance).toNumber()
      : 0;
    const endingBalance = statements?.[statements.length - 1]?.end_balance
      ? new Decimal(statements[statements.length - 1].end_balance).toNumber()
      : 0;

    const summary: ReportSummary = {
      beginningBalance,
      endingBalance,
      totalDeposits:
        statements?.reduce((sum, s) => sum + new Decimal(s.additions).toNumber(), 0) || 0,
      totalWithdrawals:
        statements?.reduce((sum, s) => sum + new Decimal(s.redemptions).toNumber(), 0) || 0,
      netIncome: statements?.reduce((sum, s) => sum + new Decimal(s.net_income).toNumber(), 0) || 0,
      ytdReturn: statements?.[statements.length - 1]?.rate_of_return_ytd
        ? new Decimal(statements[statements.length - 1].rate_of_return_ytd).toNumber()
        : 0,
    };

    summary.totalReturn =
      endingBalance -
      beginningBalance +
      (summary.totalWithdrawals || 0) -
      (summary.totalDeposits || 0);
    summary.returnPercentage = ((summary.totalReturn || 0) / (beginningBalance || 1)) * 100;

    return {
      title: `Annual Summary Report`,
      subtitle: `Year ${year}`,
      generatedDate: new Date(),
      reportPeriod: `${year}`,
      summary,
      performance: {
        periods: this.calculatePerformancePeriods(statements || []),
      },
    };
  }

  /**
   * Helper: Format transactions for report
   */
  private static formatTransactions(transactions: Record<string, unknown>[]): TransactionData[] {
    return transactions.map((t) => ({
      id: t.id,
      date: new Date(t.created_at).toLocaleDateString(),
      type: t.type,
      assetCode: t.asset_code,
      amount: new Decimal(t.amount).toNumber(),
      value: new Decimal(t.amount).toNumber(),
      status: t.status,
      txHash: t.tx_hash || undefined,
      note: t.note || undefined,
    }));
  }

  /**
   * Helper: Calculate performance periods from statements
   */
  private static calculatePerformancePeriods(
    statements: Record<string, unknown>[]
  ): PerformancePeriod[] {
    return statements.map((s) => {
      const beginValue = new Decimal(s.begin_balance).toNumber();
      const endValue = new Decimal(s.end_balance).toNumber();
      const netCashFlow =
        new Decimal(s.additions).toNumber() - new Decimal(s.redemptions).toNumber();

      return {
        period: `${s.period_year}-${String(s.period_month).padStart(2, "0")}`,
        beginDate: new Date(s.period_year, s.period_month - 1, 1).toISOString(),
        endDate: new Date(s.period_year, s.period_month, 0).toISOString(),
        beginValue,
        endValue,
        netCashFlow,
        return: endValue - beginValue - netCashFlow,
        returnPercentage: s.rate_of_return_mtd ? new Decimal(s.rate_of_return_mtd).toNumber() : 0,
      };
    });
  }
}
