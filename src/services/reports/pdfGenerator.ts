/**
 * Professional PDF Report Generator
 * Creates branded PDF reports with charts, tables, and professional formatting
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ReportData, ReportStyles } from "@/types/domains";
import { getAssetLogo } from "@/utils/assets";
import { formatAssetWithSymbol } from "@/utils/formatters";

/** Convert string or number to number for calculations */
const toNum = (value: string | number | undefined | null): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
    lastAutoTable?: { finalY: number };
  }
}

interface PDFGenerationOptions {
  includeCharts?: boolean;
  includePageNumbers?: boolean;
  includeWatermark?: boolean;
  confidential?: boolean;
  styles?: Partial<ReportStyles>;
}

interface PDFGenerationResult {
  success: boolean;
  data?: Uint8Array;
  filename?: string;
  pageCount?: number;
  fileSizeBytes?: number;
  error?: string;
}

export class PDFReportGenerator {
  private doc: jsPDF;
  private styles: ReportStyles;
  private currentY: number = 0;
  private margin: number = 40;
  private pageWidth: number;
  private pageHeight: number;
  private pageNumber: number = 1;

  // Default branding colors
  private readonly DEFAULT_STYLES: ReportStyles = {
    primaryColor: "#1e40af", // blue-700
    secondaryColor: "#64748b", // slate-500
    accentColor: "#f59e0b", // amber-500
    headerColor: "#1f2937", // gray-800
    textColor: "#374151", // gray-700
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb", // gray-200
    fontFamily: "helvetica",
    fontSize: 10,
  };

  constructor(options: PDFGenerationOptions = {}) {
    this.doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    this.styles = { ...this.DEFAULT_STYLES, ...options.styles };
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.currentY = this.margin;
  }

  /**
   * Helper to load image as base64
   */
  private async loadImage(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn(`Failed to load image: ${url}`, error);
      return null;
    }
  }

  /**
   * Generate PDF from report data
   */
  async generate(
    data: ReportData,
    options: PDFGenerationOptions = {}
  ): Promise<PDFGenerationResult> {
    try {
      // Set PDF metadata
      this.doc.setProperties({
        title: data.title,
        subject: data.subtitle || "",
        author: "Indigo Yield Platform",
        creator: "Indigo Yield Platform",
        keywords: "investment, report, statement",
      });

      // Generate cover page
      this.generateCoverPage(data);

      // Add summary page
      this.addPage();
      this.generateSummaryPage(data);

      // Add holdings if available
      if (data.holdings && data.holdings.length > 0) {
        this.addPage();
        await this.generateHoldingsPage(data); // Made async
      }

      // Add transactions if available
      if (data.transactions && data.transactions.length > 0) {
        this.addPage();
        this.generateTransactionsPage(data);
      }

      // Add performance page if available
      if (data.performance) {
        this.addPage();
        this.generatePerformancePage(data);
      }

      // Add disclosures page
      this.addPage();
      this.generateDisclosuresPage();

      // Add page numbers to all pages
      if (options.includePageNumbers !== false) {
        this.addPageNumbers();
      }

      // Get PDF as bytes
      const pdfData = this.doc.output("arraybuffer");
      const filename = this.generateFilename(data);

      return {
        success: true,
        data: new Uint8Array(pdfData),
        filename,
        pageCount: this.doc.getNumberOfPages(),
        fileSizeBytes: pdfData.byteLength,
      };
    } catch (error) {
      console.error("PDF generation failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate cover page
   */
  private generateCoverPage(data: ReportData): void {
    // Company logo/branding (centered at top)
    this.currentY = 100;
    this.doc.setFontSize(32);
    this.doc.setTextColor(this.styles.primaryColor!);
    this.doc.setFont("helvetica", "bold");
    this.centerText("INDIGO", this.currentY);

    this.currentY += 40;
    this.doc.setFontSize(16);
    this.doc.setTextColor(this.styles.secondaryColor!);
    this.doc.setFont("helvetica", "normal");
    this.centerText("YIELD PLATFORM", this.currentY);

    // Report title
    this.currentY += 100;
    this.doc.setFontSize(24);
    this.doc.setTextColor(this.styles.headerColor!);
    this.doc.setFont("helvetica", "bold");
    this.centerText(data.title, this.currentY);

    // Report subtitle
    if (data.subtitle) {
      this.currentY += 30;
      this.doc.setFontSize(14);
      this.doc.setTextColor(this.styles.textColor!);
      this.doc.setFont("helvetica", "normal");
      this.centerText(data.subtitle, this.currentY);
    }

    // Report period
    this.currentY += 50;
    this.doc.setFontSize(12);
    this.doc.setTextColor(this.styles.secondaryColor!);
    this.centerText(`Report Period: ${data.reportPeriod}`, this.currentY);

    // Investor information
    if (data.investor) {
      this.currentY += 80;
      this.doc.setFontSize(11);
      this.doc.setTextColor(this.styles.textColor!);
      this.doc.setFont("helvetica", "bold");
      this.centerText("Prepared For:", this.currentY);

      this.currentY += 20;
      this.doc.setFont("helvetica", "normal");
      this.centerText(data.investor.name, this.currentY);

      if (data.investor.accountNumber) {
        this.currentY += 15;
        this.doc.setFontSize(9);
        this.doc.setTextColor(this.styles.secondaryColor!);
        this.centerText(`Account: ${data.investor.accountNumber}`, this.currentY);
      }
    }

    // Generation date
    this.currentY = this.pageHeight - 100;
    this.doc.setFontSize(9);
    this.doc.setTextColor(this.styles.secondaryColor!);
    this.doc.setFont("helvetica", "normal");
    this.centerText(`Generated: ${format(data.generatedDate, "MMMM dd, yyyy")}`, this.currentY);

    // Confidentiality notice
    if (data.confidential) {
      this.currentY += 20;
      this.doc.setTextColor("#ef4444"); // red-500
      this.doc.setFont("helvetica", "bold");
      this.centerText("CONFIDENTIAL", this.currentY);
    }
  }

  /**
   * Generate summary page
   */
  private generateSummaryPage(data: ReportData): void {
    this.addSectionHeader("Account Summary");

    const summary = data.summary;
    const summaryData: [string, string][] = [];

    if (summary.beginningBalance !== undefined) {
      summaryData.push(["Beginning Balance", this.formatCurrency(summary.beginningBalance)]);
    }

    if (summary.totalDeposits !== undefined && summary.totalDeposits > 0) {
      summaryData.push(["Total Deposits", this.formatCurrency(summary.totalDeposits)]);
    }

    if (summary.totalWithdrawals !== undefined && summary.totalWithdrawals > 0) {
      summaryData.push(["Total Withdrawals", this.formatCurrency(summary.totalWithdrawals)]);
    }

    if (summary.netIncome !== undefined && summary.netIncome !== 0) {
      summaryData.push(["Net Income", this.formatCurrency(summary.netIncome)]);
    }

    if (summary.totalFees !== undefined && summary.totalFees > 0) {
      summaryData.push(["Total Fees", this.formatCurrency(summary.totalFees)]);
    }

    if (summary.endingBalance !== undefined) {
      summaryData.push(["Ending Balance", this.formatCurrency(summary.endingBalance)]);
    }

    if (summary.totalValue !== undefined) {
      summaryData.push(["Current Value", this.formatCurrency(summary.totalValue)]);
    }

    if (summary.totalReturn !== undefined) {
      summaryData.push(["Total Return", this.formatCurrency(summary.totalReturn)]);
    }

    if (summary.returnPercentage !== undefined) {
      summaryData.push(["Return %", this.formatPercentage(summary.returnPercentage)]);
    }

    // Create summary table
    (this.doc as any).autoTable({
      startY: this.currentY,
      head: [],
      body: summaryData,
      theme: "plain",
      styles: {
        fontSize: 10,
        cellPadding: 8,
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 200 },
        1: { halign: "right", fontStyle: "bold" },
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc.lastAutoTable?.finalY || this.currentY) + 30;

    // Performance metrics section
    if (
      summary.mtdReturn !== undefined ||
      summary.qtdReturn !== undefined ||
      summary.ytdReturn !== undefined ||
      summary.itdReturn !== undefined
    ) {
      this.addSectionHeader("Performance Metrics");

      const performanceData: [string, string][] = [];

      if (summary.mtdReturn !== undefined) {
        performanceData.push(["Month-to-Date", this.formatPercentage(summary.mtdReturn)]);
      }
      if (summary.qtdReturn !== undefined) {
        performanceData.push(["Quarter-to-Date", this.formatPercentage(summary.qtdReturn)]);
      }
      if (summary.ytdReturn !== undefined) {
        performanceData.push(["Year-to-Date", this.formatPercentage(summary.ytdReturn)]);
      }
      if (summary.itdReturn !== undefined) {
        performanceData.push(["Inception-to-Date", this.formatPercentage(summary.itdReturn)]);
      }

      (this.doc as any).autoTable({
        startY: this.currentY,
        head: [],
        body: performanceData,
        theme: "plain",
        styles: {
          fontSize: 10,
          cellPadding: 8,
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 200 },
          1: {
            halign: "right",
            fontStyle: "bold",
            textColor: this.styles.primaryColor,
          },
        },
        margin: { left: this.margin, right: this.margin },
      });

      this.currentY = this.doc.lastAutoTable?.finalY || this.currentY;
    }
  }

  /**
   * Generate holdings page
   */
  private async generateHoldingsPage(data: ReportData): Promise<void> {
    this.addSectionHeader("Portfolio Holdings");

    if (!data.holdings || data.holdings.length === 0) {
      this.doc.setFontSize(10);
      this.doc.setTextColor(this.styles.secondaryColor!);
      this.doc.text("No holdings to display", this.margin, this.currentY);
      return;
    }

    // Pre-load images
    const logoPromises = data.holdings.map((h) => {
      const url = getAssetLogo(h.assetCode);
      return this.loadImage(url);
    });
    const logos = await Promise.all(logoPromises);

    const tableData = data.holdings.map((h) => [
      "", // Placeholder for logo
      h.assetName,
      this.formatNumber(h.quantity, 8),
      this.formatCurrency(h.currentPrice, h.assetCode),
      this.formatCurrency(h.currentValue, h.assetCode),
      this.formatPercentage(h.allocationPercentage),
      this.formatCurrency(h.unrealizedGain, h.assetCode),
      this.formatPercentage(h.unrealizedGainPercentage),
    ]);

    (this.doc as any).autoTable({
      startY: this.currentY,
      head: [
        ["", "Asset", "Quantity", "Price", "Value", "Allocation", "Unrealized Gain", "Gain %"],
      ],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: this.styles.primaryColor,
        textColor: "#ffffff",
        fontStyle: "bold",
        fontSize: 9,
      },
      styles: {
        fontSize: 9,
        cellPadding: 6,
        valign: "middle",
        minCellHeight: 24, // Ensure enough height for logo
      },
      columnStyles: {
        0: { cellWidth: 24 }, // Logo column
        1: { fontStyle: "bold", cellWidth: 60 },
        2: { halign: "right", cellWidth: 70 },
        3: { halign: "right", cellWidth: 60 },
        4: { halign: "right", cellWidth: 70 },
        5: { halign: "right", cellWidth: 60 },
        6: { halign: "right", cellWidth: 70 },
        7: { halign: "right", cellWidth: 60 },
      },
      margin: { left: this.margin, right: this.margin },
      didDrawCell: (data: any) => {
        if (data.section === "body" && data.column.index === 0) {
          const logoBase64 = logos[data.row.index];
          if (logoBase64) {
            this.doc.addImage(logoBase64, "PNG", data.cell.x + 2, data.cell.y + 2, 20, 20);
          }
        }
      },
    });

    this.currentY = this.doc.lastAutoTable?.finalY || this.currentY;
  }

  /**
   * Generate transactions page
   */
  private generateTransactionsPage(data: ReportData): void {
    this.addSectionHeader("Transaction History");

    if (!data.transactions || data.transactions.length === 0) {
      this.doc.setFontSize(10);
      this.doc.setTextColor(this.styles.secondaryColor!);
      this.doc.text("No transactions to display", this.margin, this.currentY);
      return;
    }

    // Limit to most recent transactions for PDF (avoid excessive pages)
    const transactions = data.transactions.slice(0, 100);

    const tableData = transactions.map((t) => {
      // Compute status display from is_voided
      const statusDisplay = t.is_voided ? "Voided" : "Active";

      return [
        t.date,
        t.type,
        t.assetCode,
        this.formatNumber(t.amount, 8),
        this.formatCurrency(t.value, t.assetCode),
        statusDisplay,
      ];
    });

    (this.doc as any).autoTable({
      startY: this.currentY,
      head: [["Date", "Type", "Asset", "Amount", "Value", "Status"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: this.styles.primaryColor,
        textColor: "#ffffff",
        fontStyle: "bold",
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 5,
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 75 },
        2: { cellWidth: 50, fontStyle: "bold" },
        3: { halign: "right", cellWidth: 80 },
        4: { halign: "right", cellWidth: 70 },
        5: { cellWidth: 70 },
      },
      margin: { left: this.margin, right: this.margin },
      didDrawPage: (data: any) => {
        // Reset currentY for continuation on next page
        this.currentY = data.cursor?.y || this.margin;
      },
    });

    this.currentY = this.doc.lastAutoTable?.finalY || this.currentY;

    if (data.transactions.length > 100) {
      this.currentY += 20;
      this.doc.setFontSize(8);
      this.doc.setTextColor(this.styles.secondaryColor!);
      this.doc.text(
        `Showing 100 of ${data.transactions.length} transactions. For complete history, please download Excel format.`,
        this.margin,
        this.currentY
      );
    }
  }

  /**
   * Generate performance page
   */
  private generatePerformancePage(data: ReportData): void {
    this.addSectionHeader("Performance Analysis");

    if (!data.performance?.periods || data.performance.periods.length === 0) {
      this.doc.setFontSize(10);
      this.doc.setTextColor(this.styles.secondaryColor!);
      this.doc.text("No performance data available", this.margin, this.currentY);
      return;
    }

    const tableData = data.performance.periods.map((p) => [
      p.period,
      this.formatCurrency(p.beginValue),
      this.formatCurrency(p.endValue),
      this.formatCurrency(p.netCashFlow),
      this.formatCurrency(p.return),
      this.formatPercentage(p.returnPercentage),
    ]);

    (this.doc as any).autoTable({
      startY: this.currentY,
      head: [["Period", "Begin Value", "End Value", "Cash Flow", "Return", "Return %"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: this.styles.primaryColor,
        textColor: "#ffffff",
        fontStyle: "bold",
        fontSize: 9,
      },
      styles: {
        fontSize: 9,
        cellPadding: 6,
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 70 },
        1: { halign: "right", cellWidth: 75 },
        2: { halign: "right", cellWidth: 75 },
        3: { halign: "right", cellWidth: 75 },
        4: { halign: "right", cellWidth: 75 },
        5: { halign: "right", cellWidth: 60 },
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = this.doc.lastAutoTable?.finalY || this.currentY;
  }

  /**
   * Generate disclosures page
   */
  private generateDisclosuresPage(): void {
    this.addSectionHeader("Important Disclosures");

    this.doc.setFontSize(8);
    this.doc.setTextColor(this.styles.textColor!);
    this.doc.setFont("helvetica", "normal");

    const disclosures = [
      "This report is provided for informational purposes only and does not constitute investment advice, an offer to sell, or a solicitation to buy any securities.",
      "",
      "Past performance is not indicative of future results. All investments carry risk, including the potential loss of principal.",
      "",
      "The values and returns shown are based on data available at the time of generation and may be subject to change.",
      "",
      "Please consult with your tax advisor regarding the tax implications of your investments.",
      "",
      "For questions about this report or your account, please contact support@indigo.yield.",
    ];

    let textY = this.currentY;
    disclosures.forEach((line) => {
      if (line === "") {
        textY += 10;
      } else {
        const splitText = this.doc.splitTextToSize(line, this.pageWidth - 2 * this.margin);
        this.doc.text(splitText, this.margin, textY);
        textY += splitText.length * 12;
      }
    });
  }

  /**
   * Add section header
   */
  private addSectionHeader(title: string): void {
    this.currentY += 10;

    // Draw line above header
    this.doc.setDrawColor(this.styles.borderColor!);
    this.doc.setLineWidth(1);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);

    this.currentY += 20;
    this.doc.setFontSize(14);
    this.doc.setTextColor(this.styles.primaryColor!);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(title, this.margin, this.currentY);

    this.currentY += 20;
  }

  /**
   * Add new page
   */
  private addPage(): void {
    this.doc.addPage();
    this.currentY = this.margin;
    this.pageNumber++;
  }

  /**
   * Add page numbers to all pages
   */
  private addPageNumbers(): void {
    const totalPages = this.doc.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setTextColor(this.styles.secondaryColor!);
      this.doc.setFont("helvetica", "normal");

      const pageText = `Page ${i} of ${totalPages}`;
      const textWidth = this.doc.getTextWidth(pageText);
      this.doc.text(pageText, this.pageWidth / 2 - textWidth / 2, this.pageHeight - 20);
    }
  }

  /**
   * Center text on page
   */
  private centerText(text: string, y: number): void {
    const textWidth = this.doc.getTextWidth(text);
    const x = (this.pageWidth - textWidth) / 2;
    this.doc.text(text, x, y);
  }

  /**
   * Format value in native tokens when asset code is provided, otherwise format as number
   */
  private formatCurrency(value: number, assetCode?: string): string {
    if (assetCode) {
      return formatAssetWithSymbol(value, assetCode);
    }
    // Fallback to number formatting without currency symbol for aggregated values
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(value);
  }

  /**
   * Format percentage
   */
  private formatPercentage(value: number): string {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  }

  /**
   * Format number
   */
  private formatNumber(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  /**
   * Generate filename
   */
  private generateFilename(data: ReportData): string {
    const dateStr = format(new Date(), "yyyyMMdd");
    const reportTitle = data.title.replace(/\s+/g, "_").toLowerCase();
    return `${reportTitle}_${dateStr}.pdf`;
  }
}

/**
 * Convenience function to generate PDF
 */
export async function generatePDFReport(
  data: ReportData,
  options?: PDFGenerationOptions
): Promise<PDFGenerationResult> {
  const generator = new PDFReportGenerator(options);
  return generator.generate(data, options);
}
