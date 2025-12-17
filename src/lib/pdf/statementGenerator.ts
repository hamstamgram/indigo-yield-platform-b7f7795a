import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// Fund icons and branding URLs (same as shared template)
const FUND_ICONS: Record<string, string> = {
  BTC: "https://storage.mlcdn.com/account_image/855106/8Pf2dtBl6QjlVu34Pcqvyr6rUU6MWwYdN9qTrClW.png",
  ETH: "https://storage.mlcdn.com/account_image/855106/iuulK6xRS80ItnV4gq2VY7voxoWe7AMvPA5roO16.png",
  USDC: "https://storage.mlcdn.com/account_image/855106/770YUbYlWXFXPpolUS1wssuUGIeH7zHpt1mQbDah.png",
  USDT: "https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png",
  SOL: "https://storage.mlcdn.com/account_image/855106/14fmAPi88WAnAwH4XhoObK1J1HwiTSvItLhIRFSQ.png",
  EURC: "https://storage.mlcdn.com/account_image/855106/kwV87oiC7c4dnG6zkl95MnV5yafAxWlFbQgjmaIm.png",
  XRP: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
  XAUT: "https://assets.coingecko.com/coins/images/10481/large/Tether_Gold.png",
};

const COMPANY_LOGO = "https://storage.mlcdn.com/account_image/855106/T7spejaxgKvLqaFJArUJu6YSxacSpADGPyWIrbRq.png";
const FOOTER_LOGO = "https://storage.mlcdn.com/account_image/855106/5D1naaoOoLlct3mSzZSkkv7ELCCCG4kr7W9CJwSy.jpg";

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

const formatValue = (val: number | null | undefined, decimals = 4): string => {
  if (val === null || val === undefined || isNaN(val)) return "-";
  if (val === 0) return "0.0000";
  return val.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatPercent = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return "-";
  const prefix = val >= 0 ? "+" : "";
  return `${prefix}${val.toFixed(2)}%`;
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
  if ('funds' in data && Array.isArray(data.funds)) {
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
      doc.addImage(logoData, "PNG", margin + 4, yPos + 4, 12, 12);
    }
  } catch (e) {
    console.warn("Failed to load logo for PDF", e);
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
  doc.text(`Investor: ${data.investor.name}`, margin + 6, yPos + 7);

  doc.setFontSize(10);
  doc.setTextColor(...textMuted);
  const periodDate = new Date(data.period.year, data.period.month - 1);
  doc.text(
    `Investor Statement for the Period Ended: ${format(periodDate, "MMMM d, yyyy")}`,
    margin + 6,
    yPos + 14
  );

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
      const iconUrl = FUND_ICONS[asset] || FUND_ICONS.BTC;
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
        mtd: formatValue(fund.mtd_beginning_balance),
        qtd: formatValue(fund.qtd_beginning_balance),
        ytd: formatValue(fund.ytd_beginning_balance),
        itd: formatValue(fund.itd_beginning_balance),
        isHighlight: false,
      },
      {
        label: "Additions",
        mtd: formatValue(fund.mtd_additions),
        qtd: formatValue(fund.qtd_additions),
        ytd: formatValue(fund.ytd_additions),
        itd: formatValue(fund.itd_additions),
        isHighlight: false,
      },
      {
        label: "Redemptions",
        mtd: formatValue(fund.mtd_redemptions),
        qtd: formatValue(fund.qtd_redemptions),
        ytd: formatValue(fund.ytd_redemptions),
        itd: formatValue(fund.itd_redemptions),
        isHighlight: false,
      },
      {
        label: "Net Income",
        mtd: formatValue(fund.mtd_net_income),
        qtd: formatValue(fund.qtd_net_income),
        ytd: formatValue(fund.ytd_net_income),
        itd: formatValue(fund.itd_net_income),
        isHighlight: true,
        colorValues: true,
        values: [fund.mtd_net_income, fund.qtd_net_income, fund.ytd_net_income, fund.itd_net_income],
      },
      {
        label: "Ending Balance",
        mtd: formatValue(fund.mtd_ending_balance),
        qtd: formatValue(fund.qtd_ending_balance),
        ytd: formatValue(fund.ytd_ending_balance),
        itd: formatValue(fund.itd_ending_balance),
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
        values: [fund.mtd_rate_of_return, fund.qtd_rate_of_return, fund.ytd_rate_of_return, fund.itd_rate_of_return],
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
        doc.text(valueStrings[i], colStarts[i + 1] + colWidths[i + 1] - 2, rowY, { align: "right" });
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
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();

    // Footer logo
    try {
      const footerLogoData = await loadImage(FOOTER_LOGO);
      if (footerLogoData) {
        doc.addImage(footerLogoData, "JPEG", pageWidth / 2 - 15, pageHeight - 35, 30, 12);
      }
    } catch (e) {
      // Continue without footer logo
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
    doc.text("© 2025 Indigo Fund. All rights reserved.", pageWidth / 2, pageHeight - 10, { align: "center" });
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
    console.warn("Failed to load logo for PDF", e);
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

  // --- Summary Box ---
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 60, 180, 30, 3, 3, "FD");

  doc.setFontSize(10);
  doc.text("Total AUM", 24, 70);
  doc.setFontSize(14);
  doc.text(`${data.summary.total_aum.toLocaleString()}`, 24, 80);

  doc.setFontSize(10);
  doc.text("Net Income", 84, 70);
  doc.setFontSize(14);
  doc.setTextColor(
    data.summary.total_pnl >= 0 ? 22 : 220,
    data.summary.total_pnl >= 0 ? 163 : 38,
    data.summary.total_pnl >= 0 ? 74 : 38
  );
  doc.text(
    `${data.summary.total_pnl >= 0 ? "+" : ""}${data.summary.total_pnl.toLocaleString()}`,
    84,
    80
  );
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(10);
  doc.text("Fees", 144, 70);
  doc.setFontSize(14);
  doc.text(`${data.summary.total_fees.toLocaleString()}`, 144, 80);

  // --- Positions Table ---
  const tableColumn = ["Asset", "Balance", "Additions", "Withdrawals", "Yield", "Closing"];
  const tableRows = data.positions.map((pos) => [
    pos.asset_code,
    pos.opening_balance?.toFixed(4) || pos.begin_balance?.toFixed(4) || "0.0000",
    pos.additions?.toFixed(4) || "0.0000",
    pos.withdrawals?.toFixed(4) || pos.redemptions?.toFixed(4) || "0.0000",
    pos.yield_earned?.toFixed(4) || "0.0000",
    pos.closing_balance?.toFixed(4) || pos.end_balance?.toFixed(4) || "0.0000",
  ]);

  autoTable(doc, {
    startY: 100,
    head: [tableColumn],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [40, 53, 147] },
    styles: { fontSize: 9 },
  });

  // --- Footer ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: "right" });
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 285);
  }

  return doc.output("blob");
};
