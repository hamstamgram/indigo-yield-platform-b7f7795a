/**
 * Professional PDF Statement Generator
 * Generates branded investor statements with charts and tables
 */

import jsPDF from "jspdf";
import { format } from "date-fns";
import { BrandingAssets, StatementData, PDFGenerationOptions, PDFGenerationResult } from "./types";

// Default branding for the platform
const DEFAULT_BRANDING: BrandingAssets = {
  colors: {
    primary: "#1e40af", // blue-700
    secondary: "#64748b", // slate-500
    accent: "#f59e0b", // amber-500
    text: "#1f2937", // gray-800
    textSecondary: "#6b7280", // gray-500
    background: "#ffffff",
  },
  fonts: {
    primary: "helvetica",
    secondary: "helvetica",
    mono: "courier",
  },
};

export class StatementPDFGenerator {
  private doc: jsPDF;
  private branding: BrandingAssets;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 40;
  private currentY: number = 0;
  private lineHeight: number = 6;

  constructor(branding: Partial<BrandingAssets> = {}) {
    this.doc = new jsPDF("portrait", "pt", "A4");
    this.branding = { ...DEFAULT_BRANDING, ...branding };
    this.pageWidth = this.doc.internal.pageSize.width;
    this.pageHeight = this.doc.internal.pageSize.height;
    this.currentY = this.margin;
  }

  /**
   * Generate a complete investor statement PDF
   */
  async generateStatement(
    data: StatementData,
    options: PDFGenerationOptions = {}
  ): Promise<PDFGenerationResult> {
    try {
      const startTime = Date.now();

      // Set PDF metadata
      this.setMetadata(data, options);

      // Generate PDF content
      this.generateCoverPage(data);
      this.addNewPage();
      this.generateSummaryPage(data);
      this.generateHoldingsPage(data);
      this.generatePerformancePage(data);

      if (options.includeTransactions) {
        this.generateTransactionsPage(data);
      }

      if (options.includeDisclosures) {
        this.generateDisclosuresPage();
      }

      // Get PDF as bytes
      const pdfData = this.doc.output("arraybuffer");
      const filename = this.generateFilename(data);

      const result: PDFGenerationResult = {
        success: true,
        data: new Uint8Array(pdfData),
        filename,
        metadata: {
          pages: this.doc.getNumberOfPages(),
          fileSize: pdfData.byteLength,
          generatedAt: new Date(),
        },
      };

      console.log(`PDF generated in ${Date.now() - startTime}ms`, result.metadata);
      return result;
    } catch (error) {
      console.error("PDF generation failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private setMetadata(data: StatementData, options: PDFGenerationOptions): void {
    const metadata = options.metadata || {};

    this.doc.setProperties({
      title:
        metadata.title ||
        `${data.investor.fund_name} Statement - ${format(data.period.end, "MMM yyyy")}`,
      author: metadata.author || data.investor.fund_name,
      subject: metadata.subject || "Investment Account Statement",
      creator: metadata.creator || "Indigo Yield Platform",
      keywords: "investment, statement, portfolio, performance",
    });
  }

  private generateCoverPage(data: StatementData): void {
    this.currentY = this.margin;

    // Header with logo space
    if (this.branding.logo) {
      try {
        this.doc.addImage(this.branding.logo, "PNG", this.margin, this.currentY, 120, 40);
      } catch (error) {
        console.warn("Failed to add logo:", error);
      }
    }
    this.currentY += 80;

    // Fund name and statement title
    this.doc.setFont(this.branding.fonts.primary, "bold");
    this.doc.setFontSize(24);
    this.doc.setTextColor(this.branding.colors.primary);
    this.doc.text(data.investor.fund_name, this.margin, this.currentY);
    this.currentY += 30;

    this.doc.setFontSize(18);
    this.doc.setTextColor(this.branding.colors.text);
    this.doc.text("Investment Account Statement", this.margin, this.currentY);
    this.currentY += 50;

    // Statement period
    this.doc.setFont(this.branding.fonts.primary, "normal");
    this.doc.setFontSize(12);
    this.doc.setTextColor(this.branding.colors.textSecondary);
    this.doc.text("Statement Period:", this.margin, this.currentY);
    this.currentY += this.lineHeight * 2;

    this.doc.setFontSize(14);
    this.doc.setTextColor(this.branding.colors.text);
    this.doc.text(
      `${format(data.period.start, "MMMM d, yyyy")} - ${format(data.period.end, "MMMM d, yyyy")}`,
      this.margin,
      this.currentY
    );
    this.currentY += 40;

    // Investor information
    this.generateInvestorInfoSection(data);

    // Summary box
    this.generateSummaryBox(data);

    // Footer
    this.generatePageFooter();
  }

  private generateInvestorInfoSection(data: StatementData): void {
    const boxY = this.currentY;
    const boxHeight = 100;

    // Draw border
    this.doc.setDrawColor(this.branding.colors.secondary);
    this.doc.setLineWidth(1);
    this.doc.rect(this.margin, boxY, this.pageWidth - 2 * this.margin, boxHeight);

    this.currentY = boxY + 20;

    // Account holder
    this.doc.setFont(this.branding.fonts.primary, "bold");
    this.doc.setFontSize(12);
    this.doc.setTextColor(this.branding.colors.textSecondary);
    this.doc.text("Account Holder:", this.margin + 20, this.currentY);
    this.currentY += this.lineHeight * 2;

    this.doc.setFont(this.branding.fonts.primary, "normal");
    this.doc.setFontSize(12);
    this.doc.setTextColor(this.branding.colors.text);
    this.doc.text(data.investor.name, this.margin + 20, this.currentY);
    this.currentY += this.lineHeight * 2;

    // Account number (if available)
    if (data.investor.account_number) {
      this.doc.setFont(this.branding.fonts.primary, "bold");
      this.doc.setTextColor(this.branding.colors.textSecondary);
      this.doc.text("Account Number:", this.margin + 20, this.currentY);

      this.doc.setFont(this.branding.fonts.mono, "normal");
      this.doc.setTextColor(this.branding.colors.text);
      this.doc.text(data.investor.account_number, this.margin + 120, this.currentY);
    }

    this.currentY = boxY + boxHeight + 30;
  }

  private generateSummaryBox(data: StatementData): void {
    const boxY = this.currentY;
    const boxHeight = 200;

    // Background
    const bgColor = this.hexToRgb(this.branding.colors.primary + "10"); // 10% opacity
    this.doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    this.doc.rect(this.margin, boxY, this.pageWidth - 2 * this.margin, boxHeight, "F");

    // Border
    this.doc.setDrawColor(this.branding.colors.primary);
    this.doc.setLineWidth(2);
    this.doc.rect(this.margin, boxY, this.pageWidth - 2 * this.margin, boxHeight);

    this.currentY = boxY + 30;

    // Title
    this.doc.setFont(this.branding.fonts.primary, "bold");
    this.doc.setFontSize(16);
    this.doc.setTextColor(this.branding.colors.primary);
    this.doc.text("Portfolio Summary", this.margin + 20, this.currentY);
    this.currentY += 30;

    // Key metrics in two columns
    const leftCol = this.margin + 20;
    const rightCol = this.margin + (this.pageWidth - 2 * this.margin) / 2;

    this.generateSummaryItem(
      "Total Portfolio Value",
      this.formatCurrency(data.summary.totalValue),
      leftCol,
      this.currentY
    );
    this.generateSummaryItem(
      "Total Return",
      `${this.formatCurrency(data.summary.totalReturn)} (${this.formatPercent(data.summary.totalReturnPercent)})`,
      rightCol,
      this.currentY
    );
    this.currentY += 25;

    this.generateSummaryItem(
      "Beginning Value",
      this.formatCurrency(data.summary.beginningValue),
      leftCol,
      this.currentY
    );
    this.generateSummaryItem(
      "Net Deposits",
      this.formatCurrency(data.summary.netDeposits),
      rightCol,
      this.currentY
    );
    this.currentY += 25;

    this.generateSummaryItem(
      "Ending Value",
      this.formatCurrency(data.summary.endingValue),
      leftCol,
      this.currentY
    );
    this.generateSummaryItem(
      "Management Fees",
      this.formatCurrency(data.summary.managementFees),
      rightCol,
      this.currentY
    );

    this.currentY = boxY + boxHeight + 40;
  }

  private generateSummaryItem(label: string, value: string, x: number, y: number): void {
    this.doc.setFont(this.branding.fonts.primary, "normal");
    this.doc.setFontSize(10);
    this.doc.setTextColor(this.branding.colors.textSecondary);
    this.doc.text(label, x, y);

    this.doc.setFont(this.branding.fonts.primary, "bold");
    this.doc.setFontSize(12);
    this.doc.setTextColor(this.branding.colors.text);
    this.doc.text(value, x, y + 12);
  }

  private generateSummaryPage(data: StatementData): void {
    this.currentY = this.margin;
    this.generatePageHeader("Portfolio Summary");

    // Add allocation chart if available
    if (data.charts.allocationChart) {
      try {
        this.doc.addImage(data.charts.allocationChart, "PNG", this.margin, this.currentY, 250, 200);
        this.currentY += 220;
      } catch (error) {
        console.warn("Failed to add allocation chart:", error);
      }
    }

    // Performance metrics table
    this.generatePerformanceTable(data);
  }

  private generateHoldingsPage(data: StatementData): void {
    this.addNewPage();
    this.currentY = this.margin;
    this.generatePageHeader("Portfolio Holdings");

    // Holdings table
    this.generateHoldingsTable(data);
  }

  private generatePerformancePage(data: StatementData): void {
    this.addNewPage();
    this.currentY = this.margin;
    this.generatePageHeader("Performance Analysis");

    // Add performance chart if available
    if (data.charts.performanceChart) {
      try {
        this.doc.addImage(
          data.charts.performanceChart,
          "PNG",
          this.margin,
          this.currentY,
          400,
          250
        );
        this.currentY += 270;
      } catch (error) {
        console.warn("Failed to add performance chart:", error);
      }
    }

    // Performance comparison table
    if (data.performance.benchmark) {
      this.generateBenchmarkTable(data);
    }
  }

  private generateTransactionsPage(data: StatementData): void {
    this.addNewPage();
    this.currentY = this.margin;
    this.generatePageHeader("Transaction History");

    this.generateTransactionsTable(data);
  }

  private generateDisclosuresPage(): void {
    this.addNewPage();
    this.currentY = this.margin;
    this.generatePageHeader("Important Disclosures");

    const disclosures = [
      "This statement is provided for informational purposes only and should not be considered as investment advice.",
      "Past performance does not guarantee future results.",
      "All investments carry risk and may result in loss of principal.",
      "Performance data includes reinvestment of distributions and is net of management fees.",
      "Benchmarks are provided for comparison purposes only and may not reflect the actual composition or risk profile of the portfolio.",
    ];

    this.doc.setFont(this.branding.fonts.primary, "normal");
    this.doc.setFontSize(10);
    this.doc.setTextColor(this.branding.colors.text);

    disclosures.forEach((disclosure, index) => {
      const lines = this.doc.splitTextToSize(disclosure, this.pageWidth - 2 * this.margin - 20);
      this.doc.text(`${index + 1}. `, this.margin, this.currentY);
      this.doc.text(lines, this.margin + 20, this.currentY);
      this.currentY += lines.length * this.lineHeight + 5;
    });
  }

  private generatePerformanceTable(data: StatementData): void {
    const tableData = [
      ["Period", "Return"],
      ["Month-to-Date", this.formatPercent(data.performance.mtd)],
      ["Quarter-to-Date", this.formatPercent(data.performance.qtd)],
      ["Year-to-Date", this.formatPercent(data.performance.ytd)],
      ["Inception-to-Date", this.formatPercent(data.performance.itd)],
    ];

    this.generateTable(tableData, ["Period", "Return"], [150, 100]);
  }

  private generateHoldingsTable(data: StatementData): void {
    const headers = ["Asset", "Symbol", "Quantity", "Price", "Value", "% of Portfolio"];
    const colWidths = [120, 80, 80, 80, 100, 80];

    const tableData = [
      headers,
      ...data.holdings.map((holding) => [
        holding.asset,
        holding.symbol,
        holding.quantity.toFixed(4),
        this.formatCurrency(holding.price),
        this.formatCurrency(holding.value),
        this.formatPercent(holding.percentOfPortfolio),
      ]),
    ];

    this.generateTable(tableData, headers, colWidths);
  }

  private generateBenchmarkTable(data: StatementData): void {
    if (!data.performance.benchmark) return;

    const tableData = [
      ["Period", "Portfolio", "Benchmark", "Difference"],
      [
        "Month-to-Date",
        this.formatPercent(data.performance.mtd),
        this.formatPercent(data.performance.benchmark.mtd),
        this.formatPercent(data.performance.mtd - data.performance.benchmark.mtd),
      ],
      [
        "Quarter-to-Date",
        this.formatPercent(data.performance.qtd),
        this.formatPercent(data.performance.benchmark.qtd),
        this.formatPercent(data.performance.qtd - data.performance.benchmark.qtd),
      ],
      [
        "Year-to-Date",
        this.formatPercent(data.performance.ytd),
        this.formatPercent(data.performance.benchmark.ytd),
        this.formatPercent(data.performance.ytd - data.performance.benchmark.ytd),
      ],
    ];

    this.generateTable(
      tableData,
      ["Period", "Portfolio", data.performance.benchmark.name, "Difference"],
      [100, 80, 80, 80]
    );
  }

  private generateTransactionsTable(data: StatementData): void {
    const headers = ["Date", "Type", "Description", "Amount", "Balance"];
    const colWidths = [80, 80, 200, 100, 100];

    const tableData = [
      headers,
      ...data.transactions.map((tx) => [
        format(tx.date, "MM/dd/yyyy"),
        tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
        tx.description,
        this.formatCurrency(tx.amount),
        tx.balance ? this.formatCurrency(tx.balance) : "",
      ]),
    ];

    this.generateTable(tableData, headers, colWidths);
  }

  private generateTable(data: string[][], headers: string[], colWidths: number[]): void {
    const startY = this.currentY;
    const rowHeight = 20;
    const headerHeight = 25;

    // Check if table fits on current page
    const tableHeight = data.length * rowHeight + headerHeight;
    if (this.currentY + tableHeight > this.pageHeight - this.margin) {
      this.addNewPage();
      this.currentY = this.margin;
    }

    // Draw header
    const headerColor = this.hexToRgb(this.branding.colors.primary);
    this.doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    this.doc.rect(
      this.margin,
      this.currentY,
      colWidths.reduce((a, b) => a + b, 0),
      headerHeight,
      "F"
    );

    this.doc.setFont(this.branding.fonts.primary, "bold");
    this.doc.setFontSize(10);
    this.doc.setTextColor(255, 255, 255);

    let x = this.margin;
    headers.forEach((header, index) => {
      this.doc.text(header, x + 5, this.currentY + 15);
      x += colWidths[index];
    });

    this.currentY += headerHeight;

    // Draw rows
    this.doc.setFont(this.branding.fonts.primary, "normal");
    this.doc.setFontSize(9);
    this.doc.setTextColor(this.branding.colors.text);

    data.slice(1).forEach((row, rowIndex) => {
      // Alternate row colors
      if (rowIndex % 2 === 1) {
        this.doc.setFillColor(248, 249, 250);
        this.doc.rect(
          this.margin,
          this.currentY,
          colWidths.reduce((a, b) => a + b, 0),
          rowHeight,
          "F"
        );
      }

      x = this.margin;
      row.forEach((cell, colIndex) => {
        this.doc.text(cell, x + 5, this.currentY + 12);
        x += colWidths[colIndex];
      });

      this.currentY += rowHeight;
    });

    // Draw table borders
    this.doc.setDrawColor(this.branding.colors.secondary);
    this.doc.setLineWidth(0.5);

    // Horizontal lines
    for (let i = 0; i <= data.length; i++) {
      const y = startY + (i === 0 ? 0 : headerHeight + (i - 1) * rowHeight);
      this.doc.line(this.margin, y, this.margin + colWidths.reduce((a, b) => a + b, 0), y);
    }

    // Vertical lines
    x = this.margin;
    for (let i = 0; i <= colWidths.length; i++) {
      this.doc.line(x, startY, x, this.currentY);
      if (i < colWidths.length) x += colWidths[i];
    }

    this.currentY += 20;
  }

  private generatePageHeader(title: string): void {
    this.doc.setFont(this.branding.fonts.primary, "bold");
    this.doc.setFontSize(16);
    this.doc.setTextColor(this.branding.colors.primary);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 30;

    // Underline
    this.doc.setDrawColor(this.branding.colors.primary);
    this.doc.setLineWidth(2);
    this.doc.line(
      this.margin,
      this.currentY - 20,
      this.pageWidth - this.margin,
      this.currentY - 20
    );
  }

  private generatePageFooter(): void {
    const footerY = this.pageHeight - this.margin;

    this.doc.setFont(this.branding.fonts.primary, "normal");
    this.doc.setFontSize(8);
    this.doc.setTextColor(this.branding.colors.textSecondary);

    // Page number
    const pageNumber = this.doc.getCurrentPageInfo().pageNumber;
    this.doc.text(`Page ${pageNumber}`, this.pageWidth - this.margin - 30, footerY);

    // Generated date
    this.doc.text(`Generated on ${format(new Date(), "MMMM d, yyyy")}`, this.margin, footerY);
  }

  private addNewPage(): void {
    this.doc.addPage();
    this.currentY = this.margin;
    this.generatePageFooter();
  }

  private formatCurrency(amount: number, asset?: string): string {
    // Token-denominated formatting - no USD currency symbols
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(amount);
    
    // Append asset symbol if provided
    return asset ? `${formatted} ${asset}` : formatted;
  }

  private formatPercent(value: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  }

  private generateFilename(data: StatementData): string {
    const period = format(data.period.end, "yyyy-MM");
    const investor = data.investor.name.replace(/[^a-zA-Z0-9]/g, "_");
    return `${data.investor.fund_code}_Statement_${period}_${investor}.pdf`;
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  }
}
