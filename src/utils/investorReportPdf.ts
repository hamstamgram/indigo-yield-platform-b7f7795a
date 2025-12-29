import jsPDF from "jspdf";
import { InvestorData, InvestorFund, getValueColor } from "@/types/domains";

/**
 * Generate PDF from InvestorData
 */
export async function generateInvestorReportPdf(data: InvestorData): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  let yPosition = margin;

  // Helper to add new page if needed
  const checkNewPage = (requiredSpace: number = 40) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Header background
  pdf.setFillColor(237, 240, 254); // #edf0fe
  pdf.roundedRect(margin, yPosition, contentWidth, 20, 3, 3, "F");

  // Header text
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(15, 23, 42); // #0f172a
  pdf.text("INDIGO YIELD", margin + 5, yPosition + 13);

  pdf.setFontSize(14);
  pdf.text("Monthly Report", pageWidth - margin - 5, yPosition + 13, { align: "right" });

  yPosition += 25;

  // Investor info section
  pdf.setFillColor(248, 250, 252); // #f8fafc
  pdf.rect(margin, yPosition, contentWidth, 18, "F");

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(51, 65, 85); // #334155
  pdf.text(`Investor: ${data.name}`, margin + 5, yPosition + 8);

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 116, 139); // #64748b
  pdf.text(`Investor Statement for the Period Ended: ${data.reportDate}`, margin + 5, yPosition + 14);

  yPosition += 23;

  // Render each fund
  for (let i = 0; i < data.funds.length; i++) {
    const fund = data.funds[i];

    // Check if we need a new page (fund block needs ~80mm)
    checkNewPage(85);

    // Fund header
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240); // #e2e8f0
    pdf.roundedRect(margin, yPosition, contentWidth, 12, 2, 2, "FD");

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(26, 32, 44); // #1a202c
    pdf.text(fund.name, margin + 5, yPosition + 8);

    yPosition += 15;

    // Table header
    const colWidths = [45, 28, 28, 28, 28]; // Adjust column widths
    const tableX = margin + 3;
    let tableY = yPosition;

    pdf.setFillColor(248, 250, 252);
    pdf.rect(tableX, tableY, contentWidth - 6, 8, "F");

    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(100, 116, 139);

    const headers = ["CAPITAL ACCOUNT SUMMARY", `MTD (${fund.currency})`, `QTD (${fund.currency})`, `YTD (${fund.currency})`, `ITD (${fund.currency})`];
    let colX = tableX + 2;
    headers.forEach((header, idx) => {
      if (idx === 0) {
        pdf.text(header, colX, tableY + 5);
      } else {
        pdf.text(header, colX + colWidths[idx] - 2, tableY + 5, { align: "right" });
      }
      colX += colWidths[idx];
    });

    tableY += 10;

    // Data rows
    const rows = [
      { label: "Beginning Balance", values: [fund.begin_balance_mtd, fund.begin_balance_qtd, fund.begin_balance_ytd, fund.begin_balance_itd], colored: false },
      { label: "Additions", values: [fund.additions_mtd, fund.additions_qtd, fund.additions_ytd, fund.additions_itd], colored: false },
      { label: "Redemptions", values: [fund.redemptions_mtd, fund.redemptions_qtd, fund.redemptions_ytd, fund.redemptions_itd], colored: false },
      { label: "Net Income", values: [fund.net_income_mtd, fund.net_income_qtd, fund.net_income_ytd, fund.net_income_itd], colored: true },
      { label: "Ending Balance", values: [fund.ending_balance_mtd, fund.ending_balance_qtd, fund.ending_balance_ytd, fund.ending_balance_itd], colored: false, bold: true },
      { label: "Rate of Return", values: [fund.return_rate_mtd, fund.return_rate_qtd, fund.return_rate_ytd, fund.return_rate_itd], colored: true, bold: true },
    ];

    pdf.setFontSize(8);

    rows.forEach((row, rowIdx) => {
      // Alternating row background
      if (rowIdx % 2 === 1) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(tableX, tableY, contentWidth - 6, 7, "F");
      }

      // Separator line before Ending Balance
      if (row.label === "Ending Balance") {
        pdf.setDrawColor(226, 232, 240);
        pdf.line(tableX, tableY, tableX + contentWidth - 6, tableY);
      }

      colX = tableX + 2;

      // Label
      pdf.setFont("helvetica", row.bold ? "bold" : "normal");
      pdf.setTextColor(51, 65, 85);
      pdf.text(row.label, colX, tableY + 5);
      colX += colWidths[0];

      // Values
      row.values.forEach((value, valIdx) => {
        if (row.colored) {
          const color = getValueColor(value);
          if (color === "#dc2626") {
            pdf.setTextColor(220, 38, 38); // Red
          } else {
            pdf.setTextColor(22, 163, 74); // Green
          }
          pdf.setFont("helvetica", "bold");
        } else {
          pdf.setTextColor(30, 41, 59); // #1e293b
          pdf.setFont("helvetica", row.bold ? "bold" : "normal");
        }
        pdf.text(value, colX + colWidths[valIdx + 1] - 2, tableY + 5, { align: "right" });
        colX += colWidths[valIdx + 1];
      });

      tableY += 7;
    });

    yPosition = tableY + 8;

    // Add spacing between funds
    if (i < data.funds.length - 1) {
      yPosition += 5;
    }
  }

  // Footer
  checkNewPage(20);
  yPosition = pageHeight - 15;

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 116, 139);
  pdf.text("This report is confidential and intended solely for the named recipient.", pageWidth / 2, yPosition, { align: "center" });
  pdf.text(`© ${new Date().getFullYear()} Indigo Yield. All rights reserved.`, pageWidth / 2, yPosition + 4, { align: "center" });

  return pdf.output("blob");
}

/**
 * Download the PDF with a specific filename
 */
export function downloadInvestorReportPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename for investor report
 */
export function generateInvestorReportFilename(investorName: string, reportDate: string): string {
  const sanitizedName = investorName.replace(/[^a-zA-Z0-9]/g, "_");
  const sanitizedDate = reportDate.replace(/[^a-zA-Z0-9]/g, "_");
  return `Investor_Report_${sanitizedName}_${sanitizedDate}.pdf`;
}

/**
 * Combined function to generate and download PDF
 */
export async function generateAndDownloadInvestorReport(data: InvestorData): Promise<void> {
  const blob = await generateInvestorReportPdf(data);
  const filename = generateInvestorReportFilename(data.name, data.reportDate);
  downloadInvestorReportPdf(blob, filename);
}
