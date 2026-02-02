/**
 * Fee Utility Functions
 * Shared formatting and export helpers for fees components
 */

import { format } from "date-fns";

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
