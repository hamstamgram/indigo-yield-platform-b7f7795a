import jsPDF from "jspdf";
import { StatementData, formatTokenAmount, formatPercent } from "./statementCalculations";
import { FUND_ICONS, LOGO_URL } from "@/types/domains";

// Helper to format amounts consistently in PDF
// Accepts number or string (for NUMERIC precision preservation)
const formatAmount = (amount: number | string) => formatTokenAmount(Number(amount));

export async function generateStatementPDF(statementData: StatementData): Promise<Blob> {
  // Helper to load image as base64
  const loadImage = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Failed to load image:", url, e);
      return "";
    }
  };

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;

  // Load Logos
  // Note: We're doing this sequentially to keep it simple, but could be parallelized
  const logoData = await loadImage(LOGO_URL);

  let yPosition = margin;

  // Header Background
  pdf.setFillColor(248, 250, 252); // Slate-50 background for header
  pdf.rect(0, 0, pageWidth, 40, "F");

  // Render Indigo Logo
  if (logoData) {
    // Aspect ratio of the logo is roughly 3:1 based on the URL provided
    pdf.addImage(logoData, "JPEG", margin, 12, 45, 15);
  } else {
    // Fallback text if logo fails
    pdf.setTextColor(79, 70, 229);
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("INDIGO YIELD", margin, 24);
  }

  pdf.setTextColor(15, 23, 42); // Slate-900
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("MONTHLY STATEMENT", pageWidth - margin - 45, 22, { align: "left" });

  yPosition = 55;

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
      pdf.setDrawColor(226, 232, 240); // slate-200
      pdf.line(margin, yPosition - 3, pageWidth - margin, yPosition - 3);
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
    yPosition += 10; // Extra spacing for cards

    // Load ALL fund icons in parallel
    const assetIcons: Record<string, string> = {};
    await Promise.all(
      statementData.assets.map(async (asset) => {
        const iconUrl = FUND_ICONS[asset.asset_name] || FUND_ICONS["USDC YIELD FUND"]; // Fallback
        if (iconUrl) {
          assetIcons[asset.asset_name] = await loadImage(iconUrl);
        }
      })
    );

    for (const asset of statementData.assets) {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = margin;
      }

      // Draw Card Background
      const cardHeight = 45;
      pdf.setDrawColor(226, 232, 240);
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, yPosition, pageWidth - margin * 2, cardHeight, 3, 3, "S");

      // Render Fund Icon
      const iconData = assetIcons[asset.asset_name];
      const textOffsetX = iconData ? 14 : 0;

      if (iconData) {
        pdf.addImage(iconData, "PNG", margin + 4, yPosition + 4, 8, 8);
      }

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `${asset.asset_name} (${asset.asset_code})`,
        margin + 4 + textOffsetX,
        yPosition + 10
      );

      const startY = yPosition + 18;
      let rowY = startY;

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");

      const assetData = [
        [
          "Beginning Balance",
          formatAmount(asset.begin_balance),
          "Additions",
          formatAmount(asset.deposits),
        ],
        ["Interest", formatAmount(asset.interest), "Fees", formatAmount(asset.fees)],
        [
          "Withdrawals",
          formatAmount(asset.withdrawals),
          "Ending Balance",
          formatAmount(asset.end_balance),
        ],
      ];

      // Two column layout inside card
      assetData.forEach((row) => {
        // Col 1
        pdf.setTextColor(100, 116, 139); // Slate-500 label
        pdf.text(row[0], margin + 5, rowY);
        pdf.setTextColor(0, 0, 0); // Black value
        pdf.text(row[1], margin + 40, rowY, { align: "right" });

        // Col 2
        pdf.setTextColor(100, 116, 139);
        pdf.text(row[2], margin + 80, rowY);
        pdf.setTextColor(0, 0, 0);
        pdf.text(row[3], pageWidth - margin - 10, rowY, { align: "right" });

        rowY += 6;
      });

      yPosition += cardHeight + 8;
    }
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
  pdf.setFillColor(241, 245, 249); // Slate-100
  pdf.rect(margin, yPosition - 5, pageWidth - margin * 2, 8, "F");

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("Date", margin + 2, yPosition);
  pdf.text("Description", margin + 30, yPosition);
  pdf.text("Amount", pageWidth - margin - 50, yPosition, { align: "right" });
  pdf.text("Balance", pageWidth - margin - 5, yPosition, { align: "right" });
  yPosition += 6;

  // List all transactions
  pdf.setFont("helvetica", "normal");
  statementData.assets.forEach((asset) => {
    asset.transactions.forEach((tx) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = margin;
      }

      const date = new Date(tx.date).toLocaleDateString();
      pdf.text(date, margin + 2, yPosition);
      pdf.text(`${tx.description} (${asset.asset_code})`, margin + 30, yPosition);

      const amountText =
        tx.type === "withdrawal" || tx.type === "fee"
          ? `-${formatAmount(tx.amount)}`
          : formatAmount(tx.amount);

      pdf.text(amountText, pageWidth - margin - 50, yPosition, { align: "right" });
      pdf.text(formatAmount(tx.running_balance || 0), pageWidth - margin - 5, yPosition, {
        align: "right",
      });
      yPosition += 6;

      // Light separator line
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    });
  });

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
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
