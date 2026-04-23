/**
 * Fee Utility Functions
 * Shared formatting and export helpers for fees components
 */

import { format } from "date-fns";
import { logError } from "@/lib/logger";
import { parseFinancial, formatFinancialDisplay } from "@/utils/financial";
import Decimal from "decimal.js";

/**
 * Format amount based on asset type
 * Accepts string or number for NUMERIC precision compatibility
 */
export function formatFeeAmount(amount: string | number | Decimal, asset: string): string {
  const decimals = asset === "BTC" ? 8 : 6;
  return formatFinancialDisplay(
    amount instanceof Decimal ? amount.toString() : String(amount),
    decimals
  );
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
    amount: string | number;
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
    amount: string | number;
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

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, "_blank");
    if (!printWindow) {
      URL.revokeObjectURL(url);
      return;
    }
    printWindow.addEventListener(
      "load",
      () => {
        URL.revokeObjectURL(url);
        printWindow.focus();
        printWindow.print();
      },
      { once: true }
    );
  } catch (err) {
    logError("exportFeesToPDF", err);
  }
}
