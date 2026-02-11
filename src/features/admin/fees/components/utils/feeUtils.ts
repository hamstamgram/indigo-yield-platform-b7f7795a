/**
 * Fee Utility Functions
 * Shared formatting and export helpers for fees components
 */

import { format } from "date-fns";
import { logError } from "@/lib/logger";

/**
 * Format amount based on asset type
 */
export function formatFeeAmount(amount: number, asset: string): string {
  if (asset === "BTC") {
    return amount.toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 8 });
  }
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

/**
 * Export fees data to CSV
 */
export function exportFeesToCSV(
  fees: Array<{
    txDate?: string;
    createdAt: string;
    investorName: string;
    investorEmail: string;
    fundName: string;
    asset: string;
    type: string;
    amount: number;
    purpose?: string;
    visibilityScope?: string;
  }>
): void {
  const headers = [
    "Date",
    "Investor",
    "Email",
    "Fund",
    "Asset",
    "Type",
    "Amount",
    "Purpose",
    "Visibility",
  ];
  const rows = fees.map((fee) => [
    fee.txDate || fee.createdAt,
    fee.investorName,
    fee.investorEmail,
    fee.fundName,
    fee.asset,
    fee.type,
    fee.amount.toString(),
    fee.purpose || "",
    fee.visibilityScope || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `indigo-fees-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Export fees data to PDF (uses browser print-to-PDF via a styled HTML window)
 */
export function exportFeesToPDF(
  fees: Array<{
    txDate?: string;
    createdAt: string;
    investorName: string;
    fundName: string;
    asset: string;
    amount: number;
  }>
): void {
  try {
    const dateStr = format(new Date(), "yyyy-MM-dd");
    const rows = fees
      .map(
        (fee) =>
          `<tr>
            <td>${escapeHtml(fee.txDate || fee.createdAt)}</td>
            <td>${escapeHtml(fee.investorName)}</td>
            <td>${escapeHtml(fee.fundName)}</td>
            <td>${escapeHtml(fee.asset)}</td>
            <td style="text-align:right;font-family:monospace">${escapeHtml(formatFeeAmount(fee.amount, fee.asset))}</td>
          </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html><head><title>INDIGO FEES Report - ${dateStr}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 24px; color: #1a1a1a; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  p.sub { font-size: 12px; color: #666; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; border-bottom: 2px solid #333; padding: 6px 8px; font-weight: 600; }
  td { border-bottom: 1px solid #e5e5e5; padding: 5px 8px; }
  .footer { margin-top: 24px; font-size: 11px; color: #888; }
</style></head><body>
  <h1>INDIGO FEES Report</h1>
  <p class="sub">Generated ${escapeHtml(dateStr)} | ${fees.length} transactions</p>
  <table>
    <thead><tr><th>Date</th><th>Investor</th><th>Fund</th><th>Asset</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">INDIGO Yield Platform</div>
</body></html>`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  } catch (err) {
    logError("exportFeesToPDF", err);
  }
}
