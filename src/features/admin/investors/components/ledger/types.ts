/**
 * Ledger Tab Shared Types and Constants
 */

export interface LedgerTransaction {
  id: string;
  type: string;
  amount: string;
  running_balance?: string;
  asset: string;
  tx_date: string;
  notes: string | null;
  tx_hash?: string | null;
  is_voided?: boolean;
  is_system_generated?: boolean;
  purpose: string | null;
  visibility_scope?: string;
  fund?: {
    name: string;
  } | null;
}

export interface LedgerFilters {
  txType?: string;
  txPurpose?: string;
  dateFrom?: string;
  dateTo?: string;
  showVoided: boolean;
}

export interface SelectedTransaction {
  id: string;
  type: string;
  amount: string;
  asset: string;
  investorName: string;
  txDate: string;
  notes: string | null;
  txHash?: string | null;
  isSystemGenerated?: boolean;
}

export const TX_TYPES = [
  { value: "all", label: "All Types" },
  { value: "DEPOSIT", label: "Deposit" },
  { value: "WITHDRAWAL", label: "Withdrawal" },
  { value: "YIELD", label: "Yield" },
  { value: "FEE", label: "Fee" },
  { value: "FEE_CREDIT", label: "Fee Credit" },
  { value: "IB_CREDIT", label: "IB Credit" },
  { value: "INTEREST", label: "Interest" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

export const TX_PURPOSE = [
  { value: "all", label: "All Purpose" },
  { value: "reporting", label: "Reporting" },
  { value: "transaction", label: "Transaction" },
];
