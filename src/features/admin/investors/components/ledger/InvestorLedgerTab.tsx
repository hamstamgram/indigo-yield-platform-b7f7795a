/**
 * Investor Ledger Tab (formerly Transactions Tab)
 * Shows transaction history with URL-persisted filters
 * Uses React Query for proper cache invalidation
 *
 * This is the orchestrator component that composes:
 * - LedgerHeader: Title and action buttons
 * - LedgerFilters: Filter controls
 * - LedgerAlerts: Status messages and empty states
 * - LedgerTable: Transaction table with actions
 */

import { useState, useCallback, useMemo } from "react";
import { toast } from "@/hooks";
import { useUrlFilters, useInvestorLedger, useInvestorDefaultFund } from "@/hooks";
import { useLedgerSubscription } from "@/hooks/data";
import AddTransactionDialog from "@/features/admin/transactions/AddTransactionDialog";
import { VoidTransactionDialog } from "@/features/admin/transactions/VoidTransactionDialog";

import { LedgerHeader } from "./LedgerHeader";
import { LedgerFilters } from "./LedgerFilters";
import { LedgerAlerts, LedgerEmptyState } from "./LedgerAlerts";
import { LedgerTable } from "./LedgerTable";
import type { LedgerTransaction, SelectedTransaction } from "./types";

interface InvestorLedgerTabProps {
  investorId: string;
  investorName?: string;
  onDataChange?: () => void;
}

export function InvestorLedgerTab({
  investorId,
  investorName,
  onDataChange,
}: InvestorLedgerTabProps) {
  const { filters, setFilter, clearFilters, hasActiveFilters, getFilter } = useUrlFilters({
    keys: ["txType", "txPurpose", "dateFrom", "dateTo"],
  });

  const [showFilters, setShowFilters] = useState(false);
  const [showVoided, setShowVoided] = useState(false);
  const [addTxDialogOpen, setAddTxDialogOpen] = useState(false);

  // Void dialog state
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<SelectedTransaction | null>(null);

  // Convert URL filters to hook filters
  const ledgerFilters = useMemo(
    () => ({
      txType: getFilter("txType"),
      txPurpose: getFilter("txPurpose"),
      dateFrom: getFilter("dateFrom"),
      dateTo: getFilter("dateTo"),
      showVoided,
    }),
    [getFilter, showVoided]
  );

  // Use React Query hook for transactions
  const {
    transactions,
    isLoading: loading,
    error,
    refetch,
    invalidateAll,
    forceRefetch,
  } = useInvestorLedger(investorId, ledgerFilters);

  // Also fetch unfiltered count to show filter impact
  const { transactions: unfilteredTransactions } = useInvestorLedger(investorId, {
    showVoided: true,
  });

  // Use React Query hook for default fund
  const { data: defaultFundId = "" } = useInvestorDefaultFund(investorId);

  // Subscribe to real-time updates using the hook
  useLedgerSubscription(investorId, () => {
    invalidateAll();
    onDataChange?.();
  });

  // Handlers
  const handleAddTxSuccess = useCallback(() => {
    invalidateAll();
    onDataChange?.();
    setAddTxDialogOpen(false);
  }, [invalidateAll, onDataChange]);

  const handleEditVoidSuccess = useCallback(() => {
    invalidateAll();
    onDataChange?.();
    setVoidDialogOpen(false);
    setSelectedTransaction(null);
  }, [invalidateAll, onDataChange]);

  const handleResetAndRefresh = useCallback(async () => {
    clearFilters();
    setShowVoided(false);
    await forceRefetch();
    toast({
      title: "Data refreshed",
      description: "Transaction list has been updated.",
    });
  }, [clearFilters, forceRefetch]);

  // Calculate hidden transaction count
  const hiddenCount = unfilteredTransactions.length - transactions.length;

  const openVoidDialog = useCallback(
    (tx: LedgerTransaction) => {
      setSelectedTransaction({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        asset: tx.asset,
        investorName: investorName || "Unknown",
        txDate: tx.tx_date,
        notes: tx.notes || null,
        txHash: tx.tx_hash || null,
        isSystemGenerated: tx.is_system_generated || false,
      });
      setVoidDialogOpen(true);
    },
    [investorName]
  );

  // Show loading/error/empty states via LedgerAlerts
  const showTable = !loading && !error && transactions.length > 0;

  return (
    <div className="space-y-4">
      {/* Header with Add Transaction Button and Filters Toggle */}
      <LedgerHeader
        transactionCount={transactions.length}
        totalCount={unfilteredTransactions.length}
        showVoided={showVoided}
        showFilters={showFilters}
        hasActiveFilters={hasActiveFilters}
        onToggleVoided={() => setShowVoided(!showVoided)}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onClearFilters={clearFilters}
        onAddTransaction={() => setAddTxDialogOpen(true)}
      />

      {/* Alerts (filter impact, errors, loading) */}
      <LedgerAlerts
        loading={loading}
        error={error}
        transactionCount={transactions.length}
        totalCount={unfilteredTransactions.length}
        hiddenCount={hiddenCount}
        showVoided={showVoided}
        hasActiveFilters={hasActiveFilters}
        onClearAndRefresh={handleResetAndRefresh}
        onRetry={refetch}
        onClearFilters={clearFilters}
      />

      {/* Filter Row */}
      {showFilters && (
        <LedgerFilters
          txType={getFilter("txType", "all")}
          txPurpose={getFilter("txPurpose", "all")}
          dateFrom={getFilter("dateFrom", "")}
          dateTo={getFilter("dateTo", "")}
          onTypeChange={(v) => setFilter("txType", v)}
          onPurposeChange={(v) => setFilter("txPurpose", v)}
          onDateFromChange={(v) => setFilter("dateFrom", v)}
          onDateToChange={(v) => setFilter("dateTo", v)}
        />
      )}

      {/* Transactions Table */}
      {showTable ? (
        <LedgerTable transactions={transactions as LedgerTransaction[]} onVoid={openVoidDialog} />
      ) : (
        !loading &&
        !error &&
        transactions.length === 0 && (
          <LedgerEmptyState hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters} />
        )
      )}

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        open={addTxDialogOpen}
        onOpenChange={setAddTxDialogOpen}
        investorId={investorId}
        fundId={defaultFundId ?? undefined}
        onSuccess={handleAddTxSuccess}
      />

      {/* Void Transaction Dialog */}
      <VoidTransactionDialog
        open={voidDialogOpen}
        onOpenChange={setVoidDialogOpen}
        transaction={selectedTransaction}
        onSuccess={handleEditVoidSuccess}
      />
    </div>
  );
}

export default InvestorLedgerTab;
