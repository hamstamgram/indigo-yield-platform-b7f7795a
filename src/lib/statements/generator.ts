/**
 * PDF Statement Generator
 *
 * PHASE 2: Feature Completion
 * Generates professional PDF statements for investors
 *
 * Features:
 * - Monthly/Quarterly/Annual statements
 * - Accurate financial calculations using Decimal.js
 * - Portfolio summary
 * - Transaction history
 * - Yield summary
 * - Fee breakdown
 * - Professional branding
 */

// TODO: Install pdfkit when Phase 2 is activated
// import PDFDocument from "pdfkit";
// Temporary stub to allow compilation
type PDFDocument = any;
import { PassThrough } from "stream";
import { toDecimal, formatMoney, formatCrypto, formatPercentage } from "@/utils/financial";

export interface StatementData {
  investor: {
    id: string;
    name: string;
    email: string;
    account_number: string;
  };
  period: {
    start_date: string;
    end_date: string;
    type: "MONTHLY" | "QUARTERLY" | "ANNUAL";
  };
  portfolio: {
    opening_balance: string;
    closing_balance: string;
    positions: Array<{
      asset_symbol: string;
      amount: string;
      price_usd: string;
      value_usd: string;
    }>;
  };
  transactions: Array<{
    id: string;
    type: "DEPOSIT" | "WITHDRAWAL" | "YIELD" | "FEE";
    asset_symbol: string;
    amount: string;
    value_usd: string;
    created_at: string;
    description?: string;
  }>;
  yields: {
    total_yield: string;
    yield_by_asset: Array<{
      asset_symbol: string;
      yield_amount: string;
      yield_rate: string;
    }>;
  };
  fees: {
    total_fees: string;
    fee_percentage: string;
    fee_transactions: Array<{
      date: string;
      amount: string;
      description: string;
    }>;
  };
}

export class StatementGenerator {
  private doc: any; // PDFKit.PDFDocument - stubbed until Phase 2
  private data: StatementData;

  constructor(data: StatementData) {
    this.data = data;
    // Stubbed until pdfkit is installed in Phase 2
    this.doc = {} as any;
    /* Original code - restore in Phase 2:
    this.doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
      info: {
        Title: `Statement - ${data.investor.name} - ${data.period.end_date}`,
        Author: "Indigo Yield Platform",
        Subject: "Investment Statement",
        Keywords: "investment, statement, portfolio",
      },
    });
    */
  }

  /**
   * Generate PDF and return as Buffer
   */
  async generate(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const buffers: Buffer[] = [];
      const stream = new PassThrough();

      stream.on("data", (chunk) => buffers.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(buffers)));
      stream.on("error", reject);

      this.doc.pipe(stream);

      // Generate content
      this.addHeader();
      this.addInvestorInfo();
      this.addPeriodInfo();
      this.addPortfolioSummary();
      this.addTransactionHistory();
      this.addYieldSummary();
      this.addFeeSummary();
      this.addFooter();

      this.doc.end();
    });
  }

  /**
   * Generate PDF and return as Stream
   */
  generateStream(): NodeJS.ReadableStream {
    this.addHeader();
    this.addInvestorInfo();
    this.addPeriodInfo();
    this.addPortfolioSummary();
    this.addTransactionHistory();
    this.addYieldSummary();
    this.addFeeSummary();
    this.addFooter();
    this.doc.end();
    return this.doc;
  }

  private addHeader() {
    // Logo (placeholder - replace with actual logo)
    this.doc
      .fontSize(24)
      .fillColor("#1a1a1a")
      .text("INDIGO", 50, 50)
      .fontSize(12)
      .fillColor("#666")
      .text("YIELD PLATFORM", 50, 78);

    // Statement title
    this.doc
      .fontSize(20)
      .fillColor("#1a1a1a")
      .text("Investment Statement", 400, 50, { align: "right" });

    // Statement date
    this.doc
      .fontSize(10)
      .fillColor("#666")
      .text(
        `Generated: ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        400,
        75,
        { align: "right" }
      );

    this.doc.moveDown(3);
  }

  private addInvestorInfo() {
    const y = 130;

    this.doc
      .fontSize(12)
      .fillColor("#1a1a1a")
      .text("Investor Information", 50, y, { underline: true });

    this.doc
      .fontSize(10)
      .fillColor("#666")
      .text(`Name:`, 50, y + 25)
      .fillColor("#1a1a1a")
      .text(this.data.investor.name, 150, y + 25);

    this.doc
      .fillColor("#666")
      .text(`Email:`, 50, y + 40)
      .fillColor("#1a1a1a")
      .text(this.data.investor.email, 150, y + 40);

    this.doc
      .fillColor("#666")
      .text(`Account Number:`, 50, y + 55)
      .fillColor("#1a1a1a")
      .text(this.data.investor.account_number, 150, y + 55);

    this.doc.moveDown(2);
  }

  private addPeriodInfo() {
    const y = this.doc.y + 20;

    this.doc.fontSize(12).fillColor("#1a1a1a").text("Statement Period", 50, y, { underline: true });

    const startDate = new Date(this.data.period.start_date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const endDate = new Date(this.data.period.end_date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    this.doc
      .fontSize(10)
      .fillColor("#666")
      .text(`From:`, 50, y + 25)
      .fillColor("#1a1a1a")
      .text(startDate, 150, y + 25);

    this.doc
      .fillColor("#666")
      .text(`To:`, 50, y + 40)
      .fillColor("#1a1a1a")
      .text(endDate, 150, y + 40);

    this.doc
      .fillColor("#666")
      .text(`Statement Type:`, 50, y + 55)
      .fillColor("#1a1a1a")
      .text(this.data.period.type, 150, y + 55);

    this.doc.moveDown(2);
  }

  private addPortfolioSummary() {
    const y = this.doc.y + 20;

    // Section header
    this.doc
      .fontSize(14)
      .fillColor("#1a1a1a")
      .text("Portfolio Summary", 50, y, { underline: true });

    this.doc.moveDown(1);

    // Opening/Closing balance box
    const boxY = this.doc.y;
    this.doc.roundedRect(50, boxY, 495, 80, 5).fillAndStroke("#f8f8f8", "#e0e0e0");

    this.doc
      .fontSize(10)
      .fillColor("#666")
      .text("Opening Balance", 70, boxY + 20)
      .fontSize(16)
      .fillColor("#1a1a1a")
      .text(formatMoney(this.data.portfolio.opening_balance), 70, boxY + 40);

    this.doc
      .fontSize(10)
      .fillColor("#666")
      .text("Closing Balance", 320, boxY + 20)
      .fontSize(16)
      .fillColor("#1a1a1a")
      .text(formatMoney(this.data.portfolio.closing_balance), 320, boxY + 40);

    // Calculate change
    const opening = toDecimal(this.data.portfolio.opening_balance);
    const closing = toDecimal(this.data.portfolio.closing_balance);
    const change = closing.minus(opening);
    const changePercent = opening.isZero() ? toDecimal(0) : change.dividedBy(opening).times(100);

    const isPositive = change.greaterThanOrEqualTo(0);

    this.doc
      .fontSize(10)
      .fillColor(isPositive ? "#16a34a" : "#dc2626")
      .text(
        `${isPositive ? "+" : ""}${formatMoney(change)} (${isPositive ? "+" : ""}${changePercent.toFixed(2)}%)`,
        70,
        boxY + 65
      );

    this.doc.moveDown(3);

    // Positions table
    const tableY = this.doc.y + 10;

    this.doc.fontSize(12).fillColor("#1a1a1a").text("Current Holdings", 50, tableY);

    this.doc.moveDown(0.5);

    // Table header
    const headerY = this.doc.y;
    this.doc
      .fontSize(9)
      .fillColor("#666")
      .text("Asset", 50, headerY)
      .text("Amount", 200, headerY, { width: 100, align: "right" })
      .text("Price", 310, headerY, { width: 100, align: "right" })
      .text("Value", 420, headerY, { width: 125, align: "right" });

    // Horizontal line
    this.doc
      .moveTo(50, headerY + 15)
      .lineTo(545, headerY + 15)
      .stroke("#e0e0e0");

    // Table rows
    let rowY = headerY + 25;

    for (const position of this.data.portfolio.positions) {
      if (rowY > 700) {
        this.doc.addPage();
        rowY = 50;
      }

      this.doc
        .fontSize(10)
        .fillColor("#1a1a1a")
        .text(position.asset_symbol, 50, rowY)
        .text(formatCrypto(position.amount, 8), 200, rowY, { width: 100, align: "right" })
        .text(formatMoney(position.price_usd), 310, rowY, { width: 100, align: "right" })
        .text(formatMoney(position.value_usd), 420, rowY, { width: 125, align: "right" });

      rowY += 20;
    }

    this.doc.moveDown(2);
  }

  private addTransactionHistory() {
    if (this.doc.y > 650) {
      this.doc.addPage();
    }

    const y = this.doc.y + 20;

    this.doc
      .fontSize(14)
      .fillColor("#1a1a1a")
      .text("Transaction History", 50, y, { underline: true });

    this.doc.moveDown(1);

    if (this.data.transactions.length === 0) {
      this.doc
        .fontSize(10)
        .fillColor("#666")
        .text("No transactions during this period", 50, this.doc.y);
      return;
    }

    // Table header
    const headerY = this.doc.y;
    this.doc
      .fontSize(9)
      .fillColor("#666")
      .text("Date", 50, headerY)
      .text("Type", 150, headerY)
      .text("Asset", 250, headerY)
      .text("Amount", 330, headerY, { width: 90, align: "right" })
      .text("Value", 430, headerY, { width: 115, align: "right" });

    // Horizontal line
    this.doc
      .moveTo(50, headerY + 15)
      .lineTo(545, headerY + 15)
      .stroke("#e0e0e0");

    // Table rows
    let rowY = headerY + 25;

    for (const tx of this.data.transactions) {
      if (rowY > 700) {
        this.doc.addPage();
        rowY = 50;
      }

      const date = new Date(tx.created_at).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });

      const typeColor =
        tx.type === "DEPOSIT" ? "#16a34a" : tx.type === "WITHDRAWAL" ? "#dc2626" : "#666";

      this.doc
        .fontSize(9)
        .fillColor("#1a1a1a")
        .text(date, 50, rowY)
        .fillColor(typeColor)
        .text(tx.type, 150, rowY)
        .fillColor("#1a1a1a")
        .text(tx.asset_symbol, 250, rowY)
        .text(formatCrypto(tx.amount, 8), 330, rowY, { width: 90, align: "right" })
        .text(formatMoney(tx.value_usd), 430, rowY, { width: 115, align: "right" });

      if (tx.description) {
        rowY += 12;
        this.doc.fontSize(8).fillColor("#999").text(tx.description, 150, rowY, { width: 395 });
      }

      rowY += 20;
    }

    this.doc.moveDown(2);
  }

  private addYieldSummary() {
    if (this.doc.y > 650) {
      this.doc.addPage();
    }

    const y = this.doc.y + 20;

    this.doc.fontSize(14).fillColor("#1a1a1a").text("Yield Summary", 50, y, { underline: true });

    this.doc.moveDown(1);

    // Total yield box
    const boxY = this.doc.y;
    this.doc.roundedRect(50, boxY, 495, 60, 5).fillAndStroke("#f0fdf4", "#86efac");

    this.doc
      .fontSize(10)
      .fillColor("#166534")
      .text("Total Yield Earned", 70, boxY + 15)
      .fontSize(18)
      .fillColor("#16a34a")
      .text(formatMoney(this.data.yields.total_yield), 70, boxY + 35);

    this.doc.moveDown(2.5);

    // Yield by asset
    if (this.data.yields.yield_by_asset.length > 0) {
      const tableY = this.doc.y;

      this.doc
        .fontSize(9)
        .fillColor("#666")
        .text("Asset", 50, tableY)
        .text("Yield Rate", 250, tableY, { width: 100, align: "right" })
        .text("Yield Amount", 360, tableY, { width: 185, align: "right" });

      let rowY = tableY + 20;

      for (const item of this.data.yields.yield_by_asset) {
        this.doc
          .fontSize(10)
          .fillColor("#1a1a1a")
          .text(item.asset_symbol, 50, rowY)
          .text(formatPercentage(item.yield_rate, 2), 250, rowY, { width: 100, align: "right" })
          .fillColor("#16a34a")
          .text(formatCrypto(item.yield_amount, 8, item.asset_symbol), 360, rowY, {
            width: 185,
            align: "right",
          });

        rowY += 20;
      }
    }

    this.doc.moveDown(2);
  }

  private addFeeSummary() {
    if (this.doc.y > 650) {
      this.doc.addPage();
    }

    const y = this.doc.y + 20;

    this.doc.fontSize(14).fillColor("#1a1a1a").text("Fee Summary", 50, y, { underline: true });

    this.doc.moveDown(1);

    // Total fees box
    const boxY = this.doc.y;
    this.doc.roundedRect(50, boxY, 495, 60, 5).fillAndStroke("#fef2f2", "#fca5a5");

    this.doc
      .fontSize(10)
      .fillColor("#991b1b")
      .text(`Platform Fee (${formatPercentage(this.data.fees.fee_percentage)})`, 70, boxY + 15)
      .fontSize(18)
      .fillColor("#dc2626")
      .text(formatMoney(this.data.fees.total_fees), 70, boxY + 35);

    this.doc.moveDown(2.5);

    // Fee transactions
    if (this.data.fees.fee_transactions.length > 0) {
      const tableY = this.doc.y;

      this.doc
        .fontSize(9)
        .fillColor("#666")
        .text("Date", 50, tableY)
        .text("Description", 150, tableY)
        .text("Amount", 400, tableY, { width: 145, align: "right" });

      let rowY = tableY + 20;

      for (const fee of this.data.fees.fee_transactions) {
        this.doc
          .fontSize(9)
          .fillColor("#1a1a1a")
          .text(new Date(fee.date).toLocaleDateString(), 50, rowY)
          .text(fee.description, 150, rowY, { width: 240 })
          .fillColor("#dc2626")
          .text(formatMoney(fee.amount), 400, rowY, { width: 145, align: "right" });

        rowY += 20;
      }
    }

    this.doc.moveDown(2);
  }

  private addFooter() {
    const pageCount = this.doc.bufferedPageRange().count;

    for (let i = 0; i < pageCount; i++) {
      this.doc.switchToPage(i);

      // Footer line
      this.doc.moveTo(50, 770).lineTo(545, 770).stroke("#e0e0e0");

      // Footer text
      this.doc
        .fontSize(8)
        .fillColor("#999")
        .text(
          "This statement is generated for informational purposes only. Please retain for your records.",
          50,
          780,
          { align: "center", width: 495 }
        );

      // Page number
      this.doc.text(`Page ${i + 1} of ${pageCount}`, 50, 780, { align: "right", width: 495 });
    }
  }
}

/**
 * Generate statement PDF
 */
export async function generateStatement(data: StatementData): Promise<Buffer> {
  const generator = new StatementGenerator(data);
  return generator.generate();
}

/**
 * Generate statement PDF as stream
 */
export function generateStatementStream(data: StatementData): NodeJS.ReadableStream {
  const generator = new StatementGenerator(data);
  return generator.generateStream();
}
