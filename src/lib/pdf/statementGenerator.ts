import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface StatementData {
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

export const generatePDF = (data: StatementData): Blob => {
  const doc = new jsPDF();

  // --- Header ---
  doc.setFontSize(20);
  doc.setTextColor(40, 53, 147); // Indigo
  doc.text("INDIGO YIELD FUND", 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Monthly Investment Statement", 14, 28);

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
  doc.text(`$${data.summary.total_aum.toLocaleString()}`, 24, 80);

  doc.setFontSize(10);
  doc.text("Net Income", 84, 70);
  doc.setFontSize(14);
  doc.setTextColor(
    data.summary.total_pnl >= 0 ? 22 : 220,
    data.summary.total_pnl >= 0 ? 163 : 38,
    data.summary.total_pnl >= 0 ? 74 : 38
  ); // Green or Red
  doc.text(
    `${data.summary.total_pnl >= 0 ? "+" : ""}$${data.summary.total_pnl.toLocaleString()}`,
    84,
    80
  );
  doc.setTextColor(0, 0, 0); // Reset

  doc.setFontSize(10);
  doc.text("Fees", 144, 70);
  doc.setFontSize(14);
  doc.text(`$${data.summary.total_fees.toLocaleString()}`, 144, 80);

  // --- Positions Table ---
  const tableColumn = ["Asset", "Balance", "Additions", "Withdrawals", "Yield", "Closing"];
  const tableRows = data.positions.map((pos) => [
    pos.asset_code,
    pos.opening_balance?.toFixed(4) || "0.0000",
    pos.additions?.toFixed(4) || "0.0000",
    pos.withdrawals?.toFixed(4) || "0.0000",
    pos.yield_earned?.toFixed(4) || "0.0000",
    pos.closing_balance?.toFixed(4) || "0.0000",
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
