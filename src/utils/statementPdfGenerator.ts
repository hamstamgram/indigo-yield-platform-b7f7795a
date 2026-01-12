import jsPDF from "jspdf";
import { StatementData, formatTokenAmount, formatPercent } from "./statementCalculations";

// Helper to format amounts consistently in PDF
// Accepts number or string (for NUMERIC precision preservation)
const formatAmount = (amount: number | string) => formatTokenAmount(Number(amount));

export async function generateStatementPDF(statementData: StatementData): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;

  let yPosition = margin;

  // Add Indigo Yield logo/header
  pdf.setFillColor(79, 70, 229); // Indigo color
  pdf.rect(0, 0, pageWidth, 30, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.text("INDIGO YIELD", margin, 20);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("MONTHLY STATEMENT", pageWidth - margin - 40, 20);

  yPosition = 45;

  // Reset text color
  pdf.setTextColor(0, 0, 0);

  // Statement Period
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const periodText = `${monthNames[statementData.period_month - 1]} ${statementData.period_year}`;
  pdf.text(periodText, margin, yPosition);

  yPosition += 10;

  // Investor Information
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Investor: ${statementData.investor_name}`, margin, yPosition);
  yPosition += 5;
  pdf.text(`Email: ${statementData.investor_email}`, margin, yPosition);
  yPosition += 5;
  pdf.text(`Statement Date: ${new Date().toLocaleDateString()}`, margin, yPosition);

  yPosition += 15;

  // Summary Section
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("ACCOUNT SUMMARY", margin, yPosition);
  yPosition += 8;

  // Summary table
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  const summaryData = [
    ["Beginning Balance", formatAmount(statementData.summary.begin_balance)],
    ["Deposits", formatAmount(statementData.summary.additions)],
    ["Withdrawals", formatAmount(statementData.summary.redemptions)],
    ["Interest Earned", formatAmount(statementData.summary.net_income)],
    ["Fees", formatAmount(statementData.summary.fees)],
    ["", ""],
    ["Ending Balance", formatAmount(statementData.summary.end_balance)],
  ];

  summaryData.forEach((row) => {
    if (row[0] === "Ending Balance") {
      pdf.setFont("helvetica", "bold");
      pdf.setDrawColor(0, 0, 0);
      pdf.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    }

    pdf.text(row[0], margin, yPosition);
    pdf.text(row[1], pageWidth - margin - 30, yPosition, { align: "right" });
    yPosition += 6;
  });

  yPosition += 10;

  // Performance Section
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("PERFORMANCE", margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  const performanceData = [
    ["Month-to-Date Return", formatPercent(statementData.summary.rate_of_return_mtd)],
    ["Quarter-to-Date Return", formatPercent(statementData.summary.rate_of_return_qtd)],
    ["Year-to-Date Return", formatPercent(statementData.summary.rate_of_return_ytd)],
    ["Inception-to-Date Return", formatPercent(statementData.summary.rate_of_return_itd)],
  ];

  performanceData.forEach((row) => {
    pdf.text(row[0], margin, yPosition);
    pdf.text(row[1], pageWidth - margin - 30, yPosition, { align: "right" });
    yPosition += 6;
  });

  yPosition += 10;

  // Asset Details Section
  if (statementData.assets.length > 0) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("ASSET DETAILS", margin, yPosition);
    yPosition += 8;

    statementData.assets.forEach((asset) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${asset.asset_name} (${asset.asset_code})`, margin, yPosition);
      yPosition += 6;

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");

      const assetData = [
        ["Beginning Balance", formatAmount(asset.begin_balance)],
        ["Deposits", formatAmount(asset.deposits)],
        ["Withdrawals", formatAmount(asset.withdrawals)],
        ["Interest", formatAmount(asset.interest)],
        ["Fees", formatAmount(asset.fees)],
        ["Ending Balance", formatAmount(asset.end_balance)],
      ];

      assetData.forEach((row) => {
        pdf.text(row[0], margin + 5, yPosition);
        pdf.text(row[1], pageWidth - margin - 30, yPosition, { align: "right" });
        yPosition += 5;
      });

      yPosition += 8;
    });
  }

  // Transaction Details (if space permits or on new page)
  if (yPosition > pageHeight - 80) {
    pdf.addPage();
    yPosition = margin;
  }

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("TRANSACTION DETAILS", margin, yPosition);
  yPosition += 8;

  // Transaction headers
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("Date", margin, yPosition);
  pdf.text("Description", margin + 30, yPosition);
  pdf.text("Amount", pageWidth - margin - 50, yPosition, { align: "right" });
  pdf.text("Balance", pageWidth - margin - 20, yPosition, { align: "right" });
  yPosition += 5;

  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 3;

  // List all transactions
  pdf.setFont("helvetica", "normal");
  statementData.assets.forEach((asset) => {
    asset.transactions.forEach((tx) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = margin;
      }

      const date = new Date(tx.date).toLocaleDateString();
      pdf.text(date, margin, yPosition);
      pdf.text(`${tx.description} (${asset.asset_code})`, margin + 30, yPosition);

      const amountText =
        tx.type === "withdrawal" || tx.type === "fee"
          ? `-${formatAmount(tx.amount)}`
          : formatAmount(tx.amount);

      pdf.text(amountText, pageWidth - margin - 50, yPosition, { align: "right" });
      pdf.text(formatAmount(tx.running_balance || 0), pageWidth - margin - 20, yPosition, {
        align: "right",
      });
      yPosition += 5;
    });
  });

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    "This statement is confidential and proprietary to Indigo Yield Platform.",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  // Return as blob
  return pdf.output("blob");
}

export function generateStatementFilename(
  investor_id: string,
  period_year: number,
  period_month: number
): string {
  const paddedMonth = period_month.toString().padStart(2, "0");
  return `statement_${investor_id}_${period_year}-${paddedMonth}.pdf`;
}
