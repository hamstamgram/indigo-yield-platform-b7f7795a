/**
 * Professional Excel Report Generator
 * Creates multi-sheet Excel reports with formatting and charts
 */

import ExcelJS from "exceljs";
import { format } from "date-fns";
import {
  ReportData,
  ReportStyles,
  HoldingData,
  TransactionData,
  PerformancePeriod,
} from "@/types/domains";

/** Convert string or number to number for calculations */
const toNum = (value: string | number | undefined | null): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

interface ExcelGenerationOptions {
  includeCharts?: boolean;
  includeFormulas?: boolean;
  styles?: Partial<ReportStyles>;
}

interface ExcelGenerationResult {
  success: boolean;
  data?: Uint8Array;
  filename?: string;
  sheetCount?: number;
  fileSizeBytes?: number;
  error?: string;
}

export class ExcelReportGenerator {
  private workbook: ExcelJS.Workbook;
  private styles: ReportStyles;

  private readonly DEFAULT_STYLES: ReportStyles = {
    primaryColor: "#1e40af",
    secondaryColor: "#64748b",
    accentColor: "#f59e0b",
    headerColor: "#1f2937",
    textColor: "#374151",
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    fontFamily: "Calibri",
    fontSize: 11,
  };

  constructor(options: ExcelGenerationOptions = {}) {
    this.workbook = new ExcelJS.Workbook();
    this.styles = { ...this.DEFAULT_STYLES, ...options.styles };

    // Set workbook properties
    this.workbook.creator = "Indigo Yield Platform";
    this.workbook.lastModifiedBy = "Indigo Yield Platform";
    this.workbook.created = new Date();
    this.workbook.modified = new Date();
  }

  /**
   * Generate Excel from report data
   */
  async generate(
    data: ReportData,
    _options: ExcelGenerationOptions = {}
  ): Promise<ExcelGenerationResult> {
    try {
      // Set workbook properties
      this.workbook.title = data.title;
      this.workbook.subject = data.subtitle || "";
      this.workbook.keywords = "investment, report, statement";

      // Create sheets
      this.createSummarySheet(data);

      if (data.holdings && data.holdings.length > 0) {
        this.createHoldingsSheet(data.holdings);
      }

      if (data.transactions && data.transactions.length > 0) {
        this.createTransactionsSheet(data.transactions);
      }

      if (data.performance?.periods && data.performance.periods.length > 0) {
        this.createPerformanceSheet(data.performance.periods);
      }

      if (data.fees && data.fees.length > 0) {
        this.createFeesSheet(data.fees);
      }

      // Generate buffer
      const buffer = await this.workbook.xlsx.writeBuffer();
      const filename = this.generateFilename(data);

      return {
        success: true,
        data: new Uint8Array(buffer),
        filename,
        sheetCount: this.workbook.worksheets.length,
        fileSizeBytes: buffer.byteLength,
      };
    } catch (error) {
      console.error("Excel generation failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create summary sheet
   */
  private createSummarySheet(data: ReportData): void {
    const sheet = this.workbook.addWorksheet("Summary", {
      views: [{ state: "frozen", xSplit: 0, ySplit: 3 }],
    });

    // Set column widths
    sheet.columns = [{ width: 30 }, { width: 20 }];

    // Title section
    const titleRow = sheet.addRow([data.title]);
    titleRow.font = {
      size: 18,
      bold: true,
      color: { argb: this.styles.primaryColor!.replace("#", "FF") },
    };
    titleRow.height = 30;

    if (data.subtitle) {
      const subtitleRow = sheet.addRow([data.subtitle]);
      subtitleRow.font = { size: 12, color: { argb: "FF" + this.styles.secondaryColor!.slice(1) } };
    }

    sheet.addRow([]); // Empty row

    // Report info
    this.addSectionHeader(sheet, "Report Information");
    this.addDataRow(sheet, "Report Period", data.reportPeriod);
    this.addDataRow(sheet, "Generated Date", format(data.generatedDate, "MMMM dd, yyyy"));

    if (data.investor) {
      this.addDataRow(sheet, "Investor Name", data.investor.name);
      if (data.investor.accountNumber) {
        this.addDataRow(sheet, "Account Number", data.investor.accountNumber);
      }
    }

    sheet.addRow([]); // Empty row

    // Account Summary
    this.addSectionHeader(sheet, "Account Summary");

    const summary = data.summary;
    if (summary.beginningBalance !== undefined) {
      this.addCurrencyRow(sheet, "Beginning Balance", toNum(summary.beginningBalance));
    }
    if (summary.totalDeposits !== undefined && toNum(summary.totalDeposits) > 0) {
      this.addCurrencyRow(sheet, "Total Deposits", toNum(summary.totalDeposits), "positive");
    }
    if (summary.totalWithdrawals !== undefined && toNum(summary.totalWithdrawals) > 0) {
      this.addCurrencyRow(sheet, "Total Withdrawals", toNum(summary.totalWithdrawals), "negative");
    }
    if (summary.netIncome !== undefined && toNum(summary.netIncome) !== 0) {
      this.addCurrencyRow(
        sheet,
        "Net Income",
        toNum(summary.netIncome),
        toNum(summary.netIncome) >= 0 ? "positive" : "negative"
      );
    }
    if (summary.totalFees !== undefined && toNum(summary.totalFees) > 0) {
      this.addCurrencyRow(sheet, "Total Fees", toNum(summary.totalFees), "negative");
    }
    if (summary.endingBalance !== undefined) {
      this.addCurrencyRow(sheet, "Ending Balance", toNum(summary.endingBalance), "bold");
    }
    if (summary.totalValue !== undefined) {
      this.addCurrencyRow(sheet, "Current Value", toNum(summary.totalValue), "bold");
    }

    sheet.addRow([]); // Empty row

    if (summary.totalReturn !== undefined) {
      this.addCurrencyRow(
        sheet,
        "Total Return",
        toNum(summary.totalReturn),
        toNum(summary.totalReturn) >= 0 ? "positive" : "negative"
      );
    }
    if (summary.returnPercentage !== undefined) {
      this.addPercentageRow(
        sheet,
        "Return %",
        toNum(summary.returnPercentage),
        toNum(summary.returnPercentage) >= 0 ? "positive" : "negative"
      );
    }

    sheet.addRow([]); // Empty row

    // Performance Metrics
    if (
      summary.mtdReturn !== undefined ||
      summary.qtdReturn !== undefined ||
      summary.ytdReturn !== undefined ||
      summary.itdReturn !== undefined
    ) {
      this.addSectionHeader(sheet, "Performance Metrics");

      if (summary.mtdReturn !== undefined) {
        this.addPercentageRow(
          sheet,
          "Month-to-Date",
          toNum(summary.mtdReturn),
          toNum(summary.mtdReturn) >= 0 ? "positive" : "negative"
        );
      }
      if (summary.qtdReturn !== undefined) {
        this.addPercentageRow(
          sheet,
          "Quarter-to-Date",
          toNum(summary.qtdReturn),
          toNum(summary.qtdReturn) >= 0 ? "positive" : "negative"
        );
      }
      if (summary.ytdReturn !== undefined) {
        this.addPercentageRow(
          sheet,
          "Year-to-Date",
          toNum(summary.ytdReturn),
          toNum(summary.ytdReturn) >= 0 ? "positive" : "negative"
        );
      }
      if (summary.itdReturn !== undefined) {
        this.addPercentageRow(
          sheet,
          "Inception-to-Date",
          toNum(summary.itdReturn),
          toNum(summary.itdReturn) >= 0 ? "positive" : "negative"
        );
      }
    }
  }

  /**
   * Create holdings sheet
   */
  private createHoldingsSheet(holdings: HoldingData[]): void {
    const sheet = this.workbook.addWorksheet("Holdings", {
      views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
    });

    // Set column widths
    sheet.columns = [
      { width: 15 }, // Asset
      { width: 20 }, // Name
      { width: 18 }, // Quantity
      { width: 15 }, // Price
      { width: 18 }, // Value
      { width: 15 }, // Allocation %
      { width: 18 }, // Cost Basis
      { width: 18 }, // Unrealized Gain
      { width: 15 }, // Gain %
    ];

    // Header row
    const headerRow = sheet.addRow([
      "Asset",
      "Name",
      "Quantity",
      "Price",
      "Value",
      "Allocation %",
      "Cost Basis",
      "Unrealized Gain",
      "Gain %",
    ]);

    this.styleHeaderRow(headerRow);

    // Data rows
    holdings.forEach((holding) => {
      const row = sheet.addRow([
        holding.assetCode,
        holding.assetName,
        toNum(holding.quantity),
        toNum(holding.currentPrice),
        toNum(holding.currentValue),
        toNum(holding.allocationPercentage) / 100,
        toNum(holding.costBasis),
        toNum(holding.unrealizedGain),
        toNum(holding.unrealizedGainPercentage) / 100,
      ]);

      // Format numbers
      row.getCell(3).numFmt = "#,##0.00000000"; // Quantity
      row.getCell(4).numFmt = "$#,##0.00"; // Price
      row.getCell(5).numFmt = "$#,##0.00"; // Value
      row.getCell(6).numFmt = "0.00%"; // Allocation
      row.getCell(7).numFmt = "$#,##0.00"; // Cost Basis
      row.getCell(8).numFmt = "$#,##0.00"; // Unrealized Gain
      row.getCell(9).numFmt = "0.00%"; // Gain %

      // Color code gains/losses
      if (toNum(holding.unrealizedGain) >= 0) {
        row.getCell(8).font = { color: { argb: "FF16a34a" } }; // green-600
        row.getCell(9).font = { color: { argb: "FF16a34a" } };
      } else {
        row.getCell(8).font = { color: { argb: "FFdc2626" } }; // red-600
        row.getCell(9).font = { color: { argb: "FFdc2626" } };
      }

      // Bold asset code
      row.getCell(1).font = { bold: true };
    });

    // Add totals row
    const lastRow = holdings.length + 1;
    const totalsRow = sheet.addRow([
      "",
      "TOTAL",
      "",
      "",
      { formula: `SUM(E2:E${lastRow})` },
      { formula: `SUM(F2:F${lastRow})` },
      { formula: `SUM(G2:G${lastRow})` },
      { formula: `SUM(H2:H${lastRow})` },
      "",
    ]);

    totalsRow.font = { bold: true };
    totalsRow.getCell(5).numFmt = "$#,##0.00";
    totalsRow.getCell(6).numFmt = "0.00%";
    totalsRow.getCell(7).numFmt = "$#,##0.00";
    totalsRow.getCell(8).numFmt = "$#,##0.00";

    // Add borders
    this.addTableBorders(sheet, 1, holdings.length + 2, 9);
  }

  /**
   * Create transactions sheet
   */
  private createTransactionsSheet(transactions: TransactionData[]): void {
    const sheet = this.workbook.addWorksheet("Transactions", {
      views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
    });

    // Set column widths
    sheet.columns = [
      { width: 18 }, // Date
      { width: 15 }, // Type
      { width: 12 }, // Asset
      { width: 20 }, // Amount
      { width: 18 }, // Value
      { width: 12 }, // Status
      { width: 30 }, // Note
      { width: 25 }, // TX Hash
    ];

    // Header row
    const headerRow = sheet.addRow([
      "Date",
      "Type",
      "Asset",
      "Amount",
      "Value",
      "Status",
      "Note",
      "Transaction Hash",
    ]);

    this.styleHeaderRow(headerRow);

    // Data rows
    transactions.forEach((tx) => {
      // Compute status display from is_voided
      const statusDisplay = tx.is_voided ? "Voided" : "Active";

      const row = sheet.addRow([
        tx.date,
        tx.type,
        tx.assetCode,
        tx.amount,
        tx.value,
        statusDisplay,
        tx.note || "",
        tx.txHash || "",
      ]);

      // Format numbers
      row.getCell(4).numFmt = "#,##0.00000000"; // Amount
      row.getCell(5).numFmt = "$#,##0.00"; // Value

      // Color code by type
      if (tx.type === "DEPOSIT") {
        row.getCell(2).font = { color: { argb: "FF16a34a" } }; // green-600
      } else if (tx.type === "WITHDRAWAL") {
        row.getCell(2).font = { color: { argb: "FFdc2626" } }; // red-600
      } else if (tx.type === "INTEREST") {
        row.getCell(2).font = { color: { argb: "FF2563eb" } }; // blue-600
      } else if (tx.type === "FEE") {
        row.getCell(2).font = { color: { argb: "FFea580c" } }; // orange-600
      }

      // Bold asset code
      row.getCell(3).font = { bold: true };
    });

    // Add borders
    this.addTableBorders(sheet, 1, transactions.length + 1, 8);

    // Add auto-filter
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 8 },
    };
  }

  /**
   * Create performance sheet
   */
  private createPerformanceSheet(periods: PerformancePeriod[]): void {
    const sheet = this.workbook.addWorksheet("Performance", {
      views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
    });

    // Set column widths
    sheet.columns = [
      { width: 12 }, // Period
      { width: 18 }, // Begin Value
      { width: 18 }, // End Value
      { width: 18 }, // Cash Flow
      { width: 18 }, // Return
      { width: 15 }, // Return %
    ];

    // Header row
    const headerRow = sheet.addRow([
      "Period",
      "Begin Value",
      "End Value",
      "Net Cash Flow",
      "Return",
      "Return %",
    ]);

    this.styleHeaderRow(headerRow);

    // Data rows
    periods.forEach((period) => {
      const row = sheet.addRow([
        period.period,
        toNum(period.beginValue),
        toNum(period.endValue),
        toNum(period.netCashFlow),
        toNum(period.return),
        toNum(period.returnPercentage) / 100,
      ]);

      // Format numbers
      row.getCell(2).numFmt = "$#,##0.00"; // Begin Value
      row.getCell(3).numFmt = "$#,##0.00"; // End Value
      row.getCell(4).numFmt = "$#,##0.00"; // Cash Flow
      row.getCell(5).numFmt = "$#,##0.00"; // Return
      row.getCell(6).numFmt = "0.00%"; // Return %

      // Color code return
      if (toNum(period.return) >= 0) {
        row.getCell(5).font = { color: { argb: "FF16a34a" } };
        row.getCell(6).font = { color: { argb: "FF16a34a" } };
      } else {
        row.getCell(5).font = { color: { argb: "FFdc2626" } };
        row.getCell(6).font = { color: { argb: "FFdc2626" } };
      }
    });

    // Add totals/averages row
    const lastRow = periods.length + 1;
    const totalsRow = sheet.addRow([
      "AVERAGE",
      "",
      "",
      { formula: `SUM(D2:D${lastRow})` },
      { formula: `SUM(E2:E${lastRow})` },
      { formula: `AVERAGE(F2:F${lastRow})` },
    ]);

    totalsRow.font = { bold: true };
    totalsRow.getCell(4).numFmt = "$#,##0.00";
    totalsRow.getCell(5).numFmt = "$#,##0.00";
    totalsRow.getCell(6).numFmt = "0.00%";

    // Add borders
    this.addTableBorders(sheet, 1, periods.length + 2, 6);
  }

  /**
   * Create fees sheet
   */
  private createFeesSheet(fees: any[]): void {
    const sheet = this.workbook.addWorksheet("Fees", {
      views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
    });

    // Set column widths
    sheet.columns = [
      { width: 12 }, // Period
      { width: 15 }, // Fee Type
      { width: 12 }, // Asset
      { width: 18 }, // Amount
      { width: 12 }, // Rate
      { width: 30 }, // Description
    ];

    // Header row
    const headerRow = sheet.addRow([
      "Period",
      "Fee Type",
      "Asset",
      "Amount",
      "Rate",
      "Description",
    ]);

    this.styleHeaderRow(headerRow);

    // Data rows
    fees.forEach((fee) => {
      const row = sheet.addRow([
        fee.period,
        fee.feeType,
        fee.assetCode,
        fee.amount,
        fee.rate / 100,
        fee.description || "",
      ]);

      row.getCell(4).numFmt = "$#,##0.00"; // Amount
      row.getCell(5).numFmt = "0.00%"; // Rate
    });

    // Add totals row
    const lastRow = fees.length + 1;
    const totalsRow = sheet.addRow(["", "TOTAL", "", { formula: `SUM(D2:D${lastRow})` }, "", ""]);

    totalsRow.font = { bold: true };
    totalsRow.getCell(4).numFmt = "$#,##0.00";

    // Add borders
    this.addTableBorders(sheet, 1, fees.length + 2, 6);
  }

  /**
   * Helper methods
   */

  private addSectionHeader(sheet: ExcelJS.Worksheet, title: string): void {
    const row = sheet.addRow([title]);
    row.font = {
      bold: true,
      size: 14,
      color: { argb: this.styles.primaryColor!.replace("#", "FF") },
    };
    row.height = 20;
  }

  private addDataRow(sheet: ExcelJS.Worksheet, label: string, value: any): void {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
  }

  private addCurrencyRow(
    sheet: ExcelJS.Worksheet,
    label: string,
    value: number,
    style?: "positive" | "negative" | "bold"
  ): void {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).numFmt = "$#,##0.00";

    if (style === "positive") {
      row.getCell(2).font = { color: { argb: "FF16a34a" } };
    } else if (style === "negative") {
      row.getCell(2).font = { color: { argb: "FFdc2626" } };
    } else if (style === "bold") {
      row.getCell(2).font = { bold: true };
    }
  }

  private addPercentageRow(
    sheet: ExcelJS.Worksheet,
    label: string,
    value: number,
    style?: "positive" | "negative" | "bold"
  ): void {
    const row = sheet.addRow([label, value / 100]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).numFmt = "0.00%";

    if (style === "positive") {
      row.getCell(2).font = { color: { argb: "FF16a34a" } };
    } else if (style === "negative") {
      row.getCell(2).font = { color: { argb: "FFdc2626" } };
    } else if (style === "bold") {
      row.getCell(2).font = { bold: true };
    }
  }

  private styleHeaderRow(row: ExcelJS.Row): void {
    row.height = 25;
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: this.styles.primaryColor!.replace("#", "FF") },
    };
    row.alignment = { vertical: "middle", horizontal: "left" };
  }

  private addTableBorders(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    endRow: number,
    numColumns: number
  ): void {
    for (let row = startRow; row <= endRow; row++) {
      for (let col = 1; col <= numColumns; col++) {
        const cell = sheet.getRow(row).getCell(col);
        cell.border = {
          top: { style: "thin", color: { argb: "FFe5e7eb" } },
          left: { style: "thin", color: { argb: "FFe5e7eb" } },
          bottom: { style: "thin", color: { argb: "FFe5e7eb" } },
          right: { style: "thin", color: { argb: "FFe5e7eb" } },
        };
      }
    }
  }

  private generateFilename(data: ReportData): string {
    const dateStr = format(new Date(), "yyyyMMdd");
    const reportTitle = data.title.replace(/\s+/g, "_").toLowerCase();
    return `${reportTitle}_${dateStr}.xlsx`;
  }
}

/**
 * Convenience function to generate Excel report
 */
export async function generateExcelReport(
  data: ReportData,
  options?: ExcelGenerationOptions
): Promise<ExcelGenerationResult> {
  const generator = new ExcelReportGenerator(options);
  return generator.generate(data, options);
}
