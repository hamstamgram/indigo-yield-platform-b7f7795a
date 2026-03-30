import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { formatPercentage, formatInvestorAmount } from "@/utils/assets";
import { logWarn } from "@/lib/logger";
import { getFundIconByAsset } from "@/types/domains/report";

const COMPANY_LOGO =
  "https://storage.mlcdn.com/account_image/855106/5D1naaoOoLlct3mSzZSkkv7ELCCCG4kr7W9CJwSy.jpg";
const SOCIAL_LINKEDIN =
  "https://storage.mlcdn.com/account_image/855106/ojd93cnCVRi5L51cI3iT2FVQKwbwUdZYyjU5UBly.png";
const SOCIAL_INSTAGRAM =
  "https://storage.mlcdn.com/account_image/855106/SkcRzdNBhSZKcJsfsRWfUUqcdl09N5aF7Oprsjhl.png";
const SOCIAL_X =
  "https://storage.mlcdn.com/account_image/855106/gecQtGTjUytuBi3PJXEx9dvCYHKL0KpLipsB0FbU.png";

export interface FundPerformanceData {
  fund_name: string;
  asset_code: string;
  mtd_beginning_balance: number;
  mtd_additions: number;
  mtd_redemptions: number;
  mtd_net_income: number;
  mtd_ending_balance: number;
  mtd_rate_of_return: number;
  qtd_beginning_balance: number;
  qtd_additions: number;
  qtd_redemptions: number;
  qtd_net_income: number;
  qtd_ending_balance: number;
  qtd_rate_of_return: number;
  ytd_beginning_balance: number;
  ytd_additions: number;
  ytd_redemptions: number;
  ytd_net_income: number;
  ytd_ending_balance: number;
  ytd_rate_of_return: number;
  itd_beginning_balance: number;
  itd_additions: number;
  itd_redemptions: number;
  itd_net_income: number;
  itd_ending_balance: number;
  itd_rate_of_return: number;
}

export interface StatementData {
  investor: {
    name: string;
    id: string;
    accountNumber: string;
    email?: string;
  };
  period: {
    month: number;
    year: number;
    start: string;
    end: string;
  };
  funds: FundPerformanceData[];
}

// Legacy interface for backward compatibility
interface LegacyStatementData {
  investor: {
    name: string;
    id: string;
    accountNumber: string;
  };
  period: {
    month: number;
    year: number;
    start: string;
    end: string;
  };
  summary: {
    total_aum: number;
    total_pnl: number;
    total_fees: number;
  };
  positions: any[];
}

const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(""); // Return empty string on error, don't block PDF generation
  });
};

const formatValue = (val: number | null | undefined, asset: string): string => {
  if (val === null || val === undefined || isNaN(val)) return "-";
  // Use high-precision investor amount formatter
  // We split by space to remove the asset symbol (e.g., "0.04981440 BTC" -> "0.04981440")
  return formatInvestorAmount(val, asset).split(" ")[0];
};

const formatPercent = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return "-";
  // Use high-precision formatter (4 decimals for audit consistency)
  return formatPercentage(val, 4);
};

const getAssetFromFundName = (fundName: string): string => {
  // Extract asset code from fund name like "BTC YIELD FUND" -> "BTC"
  const match = fundName.match(/^(\w+)\s/);
  if (match) return match[1];
  // Handle legacy fund names
  if (fundName.includes("IND-")) {
    return fundName.replace("IND-", "");
  }
  return fundName;
};

const getFundDisplayName = (fundName: string): string => {
  const asset = getAssetFromFundName(fundName);
  return `${asset} YIELD FUND`;
};

export const generatePDF = async (data: LegacyStatementData | StatementData): Promise<Blob> => {
  // Check if this is the new format with funds array
  if ("funds" in data && Array.isArray(data.funds)) {
    return generateModernPDF(data as StatementData);
  }
  // Fall back to legacy format
  return generateLegacyPDF(data as LegacyStatementData);
};

const generateModernPDF = async (data: StatementData): Promise<Blob> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let yPos = 10;

  // Brand colors
  const brandIndigo = [40, 53, 147] as const; // #283593
  const headerBg = [237, 240, 254] as const; // #edf0fe
  const textDark = [15, 23, 42] as const; // #0f172a
  const textMuted = [100, 116, 139] as const; // #64748b
  const greenColor = [22, 163, 74] as const; // #16a34a
  const redColor = [220, 38, 38] as const; // #dc2626

  // --- Header with Logo ---
  doc.setFillColor(...headerBg);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 20, "F");

  try {
    const logoData = await loadImage(COMPANY_LOGO);
    if (logoData) {
      // The new logo is a wide rectangular JPEG
      doc.addImage(logoData, "JPEG", margin + 6, yPos + 6, 28, 8);
    }
  } catch (e) {
    logWarn("statementGenerator.generateModernPDF", { reason: "Failed to load logo for PDF" });
  }

  doc.setFontSize(18);
  doc.setTextColor(...textDark);
  doc.text("Monthly Report", pageWidth - margin - 4, yPos + 13, { align: "right" });

  yPos += 26;

  // --- Investor Info Box ---
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 18, 3, 3, "FD");

  doc.setFontSize(12);
  doc.setTextColor(...textDark);
  const periodDate = new Date(data.period.year, data.period.month - 1);
  const periodLabel = format(periodDate, "MMMM yyyy");
  doc.text(`${data.investor.name} – Monthly Report – ${periodLabel}`, margin + 6, yPos + 7);

  doc.setFontSize(10);
  doc.setTextColor(...textMuted);
  doc.text(`For the Period Ended: ${format(periodDate, "MMMM d, yyyy")}`, margin + 6, yPos + 14);

  yPos += 26;

  // --- Fund Sections ---
  for (const fund of data.funds) {
    const asset = getAssetFromFundName(fund.fund_name);
    const fundDisplayName = getFundDisplayName(fund.fund_name);

    // Check if we need a new page
    if (yPos > 220) {
      doc.addPage();
      yPos = 14;
    }

    // Fund Header with icon background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 60, 3, 3, "FD");

    // Try to load fund icon
    try {
      const iconUrl = getFundIconByAsset(asset);
      const iconData = await loadImage(iconUrl);
      if (iconData) {
        doc.addImage(iconData, "PNG", margin + 6, yPos + 4, 8, 8);
      }
    } catch (e) {
      // Continue without icon
    }

    // Fund name
    doc.setFontSize(12);
    doc.setTextColor(...textDark);
    doc.text(fundDisplayName, margin + 18, yPos + 10);

    // Table headers
    const tableStartY = yPos + 16;
    const colWidths = [50, 26, 26, 26, 26];
    const colStarts = [margin + 6];
    for (let i = 0; i < colWidths.length - 1; i++) {
      colStarts.push(colStarts[i] + colWidths[i]);
    }

    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text("Capital Account Summary", colStarts[0], tableStartY);
    doc.text(`MTD (${asset})`, colStarts[1] + colWidths[1] - 2, tableStartY, { align: "right" });
    doc.text(`QTD (${asset})`, colStarts[2] + colWidths[2] - 2, tableStartY, { align: "right" });
    doc.text(`YTD (${asset})`, colStarts[3] + colWidths[3] - 2, tableStartY, { align: "right" });
    doc.text(`ITD (${asset})`, colStarts[4] + colWidths[4] - 2, tableStartY, { align: "right" });

    // Draw header line
    doc.setDrawColor(226, 232, 240);
    doc.line(margin + 6, tableStartY + 2, pageWidth - margin - 6, tableStartY + 2);

    // Table rows
    const rows = [
      {
        label: "Beginning Balance",
        mtd: formatValue(fund.mtd_beginning_balance, asset),
        qtd: formatValue(fund.qtd_beginning_balance, asset),
        ytd: formatValue(fund.ytd_beginning_balance, asset),
        itd: formatValue(fund.itd_beginning_balance, asset),
        isHighlight: false,
      },
      {
        label: "Additions",
        mtd: formatValue(fund.mtd_additions, asset),
        qtd: formatValue(fund.qtd_additions, asset),
        ytd: formatValue(fund.ytd_additions, asset),
        itd: formatValue(fund.itd_additions, asset),
        isHighlight: false,
      },
      {
        label: "Redemptions",
        mtd: formatValue(fund.mtd_redemptions, asset),
        qtd: formatValue(fund.qtd_redemptions, asset),
        ytd: formatValue(fund.ytd_redemptions, asset),
        itd: formatValue(fund.itd_redemptions, asset),
        isHighlight: false,
      },
      {
        label: "Net Income",
        mtd: formatValue(fund.mtd_net_income, asset),
        qtd: formatValue(fund.qtd_net_income, asset),
        ytd: formatValue(fund.ytd_net_income, asset),
        itd: formatValue(fund.itd_net_income, asset),
        isHighlight: true,
        colorValues: true,
        values: [
          fund.mtd_net_income,
          fund.qtd_net_income,
          fund.ytd_net_income,
          fund.itd_net_income,
        ],
      },
      {
        label: "Ending Balance",
        mtd: formatValue(fund.mtd_ending_balance, asset),
        qtd: formatValue(fund.qtd_ending_balance, asset),
        ytd: formatValue(fund.ytd_ending_balance, asset),
        itd: formatValue(fund.itd_ending_balance, asset),
        isHighlight: true,
      },
      {
        label: "Rate of Return",
        mtd: formatPercent(fund.mtd_rate_of_return),
        qtd: formatPercent(fund.qtd_rate_of_return),
        ytd: formatPercent(fund.ytd_rate_of_return),
        itd: formatPercent(fund.itd_rate_of_return),
        isHighlight: true,
        colorValues: true,
        values: [
          fund.mtd_rate_of_return,
          fund.qtd_rate_of_return,
          fund.ytd_rate_of_return,
          fund.itd_rate_of_return,
        ],
      },
    ];

    let rowY = tableStartY + 7;
    doc.setFontSize(9);

    for (const row of rows) {
      // Label
      doc.setTextColor(...textDark);
      if (row.isHighlight) {
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFont("helvetica", "normal");
      }
      doc.text(row.label, colStarts[0], rowY);

      // Values
      const valueStrings = [row.mtd, row.qtd, row.ytd, row.itd];
      const values = row.values || [0, 0, 0, 0];

      for (let i = 0; i < valueStrings.length; i++) {
        if (row.colorValues && values[i] !== undefined) {
          const val = values[i] || 0;
          if (val > 0) {
            doc.setTextColor(...greenColor);
          } else if (val < 0) {
            doc.setTextColor(...redColor);
          } else {
            doc.setTextColor(...textDark);
          }
        } else {
          doc.setTextColor(...textDark);
        }
        doc.text(valueStrings[i], colStarts[i + 1] + colWidths[i + 1] - 2, rowY, {
          align: "right",
        });
      }

      // Draw line before "Ending Balance"
      if (row.label === "Ending Balance") {
        doc.setDrawColor(226, 232, 240);
        doc.line(margin + 6, rowY - 4, pageWidth - margin - 6, rowY - 4);
      }

      rowY += 6;
    }

    yPos += 68;
  }

  // --- Footer ---
  // @ts-expect-error jsPDF internal API not exposed in type definitions
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();

    // Social links (instead of footer logo)
    try {
      const iconSize = 6;
      const spacing = 4;
      const totalWidth = iconSize * 3 + spacing * 2;
      const startX = (pageWidth - totalWidth) / 2;
      const iconY = pageHeight - 35;

      const [inData, instData, xData] = await Promise.all([
        loadImage(SOCIAL_LINKEDIN),
        loadImage(SOCIAL_INSTAGRAM),
        loadImage(SOCIAL_X),
      ]);

      if (inData) doc.addImage(inData, "PNG", startX, iconY, iconSize, iconSize);
      if (instData)
        doc.addImage(instData, "PNG", startX + iconSize + spacing, iconY, iconSize, iconSize);
      if (xData)
        doc.addImage(xData, "PNG", startX + (iconSize + spacing) * 2, iconY, iconSize, iconSize);

      // We don't make them clickable in jsPDF directly for simplicity, but the icons will display correctly.
    } catch (e) {
      // Continue without social icons
    }

    // Disclaimer
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    doc.text(
      "This document is not an offer to sell or a solicitation of an offer to buy any securities.",
      pageWidth / 2,
      pageHeight - 18,
      { align: "center" }
    );

    // Page number and generation date
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);

    // Copyright
    doc.text(
      `© ${new Date().getFullYear()} Indigo Fund. All rights reserved.`,
      pageWidth / 2,
      pageHeight - 10,
      {
        align: "center",
      }
    );
  }

  return doc.output("blob");
};

// Legacy PDF generation for backward compatibility
const generateLegacyPDF = async (data: LegacyStatementData): Promise<Blob> => {
  const doc = new jsPDF();

  // --- Header with Logo ---
  try {
    const logoData = await loadImage("/icons/icon-192.png");
    doc.addImage(logoData, "PNG", 14, 10, 12, 12);
  } catch (e) {
    logWarn("statementGenerator.generateLegacyPDF", { reason: "Failed to load logo for PDF" });
  }

  doc.setFontSize(20);
  doc.setTextColor(40, 53, 147);
  doc.text("INDIGO YIELD FUND", 32, 18);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Monthly Investment Statement", 32, 24);

  // --- Investor Info ---
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Investor: ${data.investor.name}`, 14, 40);
  doc.text(`Account: ${data.investor.accountNumber}`, 14, 46);
  doc.text(
    `Period: ${format(new Date(data.period.year, data.period.month - 1), "MMMM yyyy")}`,
    14,
    52
  );

  // --- Per-Asset Summary ---
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  const summaryHeight = Math.max(30, 14 + data.positions.length * 10);
  doc.roundedRect(14, 60, 180, summaryHeight, 3, 3, "FD");

  doc.setFontSize(10);
  doc.text("Closing Balances", 24, 70);
  doc.setFontSize(10);
  doc.text("Net Income", 120, 70);

  let summaryY = 80;
  for (const pos of data.positions) {
    const asset = pos.asset_code || "N/A";
    const closing = formatValue(Number(pos.closing_balance || 0), asset);
    const yieldEarned = Number(pos.yield_earned || 0);
    const yieldStr = `${yieldEarned >= 0 ? "+" : ""}${formatValue(yieldEarned, asset)}`;

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`${asset}: ${closing}`, 24, summaryY);

    doc.setTextColor(
      yieldEarned >= 0 ? 22 : 220,
      yieldEarned >= 0 ? 163 : 38,
      yieldEarned >= 0 ? 74 : 38
    );
    doc.text(`${asset}: ${yieldStr}`, 120, summaryY);
    doc.setTextColor(0, 0, 0);

    summaryY += 10;
  }

  // --- Positions Table ---
  const tableColumn = ["Asset", "Balance", "Additions", "Withdrawals", "Yield", "Closing"];
  const tableRows = data.positions.map((pos) => {
    // Use high-precision investor amount formatter
    const asset = (pos.asset_code || "").toUpperCase();
    const fmt = (v: number | null | undefined, fallback?: number | null) => {
      const val = v ?? fallback ?? 0;
      return formatValue(val, asset);
    };
    return [
      pos.asset_code,
      fmt(pos.opening_balance, pos.begin_balance),
      fmt(pos.additions),
      fmt(pos.withdrawals, pos.redemptions),
      fmt(pos.yield_earned),
      fmt(pos.closing_balance, pos.end_balance),
    ];
  });

  autoTable(doc, {
    startY: 60 + summaryHeight + 10,
    head: [tableColumn],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [40, 53, 147] },
    styles: { fontSize: 9 },
  });

  // --- Footer ---
  // @ts-expect-error jsPDF internal API not exposed in type definitions
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: "right" });
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 285);
  }

  return doc.output("blob");
};
