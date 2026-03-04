/**
 * Withdrawal selection hook for bulk operations
 * Manages checkbox state, computes selection summary
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import Decimal from "decimal.js";
import type { Withdrawal } from "@/types/domains";

export interface WithdrawalSelectionSummary {
  count: number;
  /** Amount totals grouped by asset, e.g. { BTC: "1.5", USDT: "3000" } */
  amountsByAsset: Record<string, string>;
  investorCount: number;
  /** True if every selected withdrawal has status "cancelled" or "rejected" */
  allCancelled: boolean;
  /** True if no selected withdrawal is cancelled */
  noneCancelled: boolean;
  /** True if any selected withdrawal is completed (cannot be deleted) */
  hasCompleted: boolean;
}

interface UseWithdrawalSelectionReturn {
  selectedIds: Set<string>;
  toggleOne: (id: string) => void;
  toggleAll: () => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  summary: WithdrawalSelectionSummary;
}

/**
 * Get the list of withdrawals eligible for selection.
 * All statuses are selectable (completed can be voided/deleted).
 */
function getSelectableRows(data: Withdrawal[]): Withdrawal[] {
  return data;
}

export function useWithdrawalSelection(
  data: Withdrawal[],
  page: number
): UseWithdrawalSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Clear selection on page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  const selectableRows = useMemo(() => getSelectableRows(data), [data]);

  const selectableIds = useMemo(() => new Set(selectableRows.map((w) => w.id)), [selectableRows]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected = selectableRows.length > 0 && selectableRows.every((w) => prev.has(w.id));
      if (allSelected) {
        return new Set();
      }
      return new Set(selectableRows.map((w) => w.id));
    });
  }, [selectableRows]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  // Filter selectedIds to only include IDs still in current data
  const validSelectedIds = useMemo(() => {
    const valid = new Set<string>();
    for (const id of selectedIds) {
      if (selectableIds.has(id)) {
        valid.add(id);
      }
    }
    return valid;
  }, [selectedIds, selectableIds]);

  const isAllSelected =
    selectableRows.length > 0 && selectableRows.every((w) => validSelectedIds.has(w.id));

  const isIndeterminate = validSelectedIds.size > 0 && !isAllSelected;

  const summary = useMemo((): WithdrawalSelectionSummary => {
    const selected = data.filter((w) => validSelectedIds.has(w.id));
    if (selected.length === 0) {
      return {
        count: 0,
        amountsByAsset: {},
        investorCount: 0,
        allCancelled: false,
        noneCancelled: true,
        hasCompleted: false,
      };
    }

    const amountsByAsset: Record<string, Decimal> = {};
    const investorIds = new Set<string>();
    let cancelledCount = 0;
    let hasCompleted = false;

    for (const w of selected) {
      const asset = w.fund_class || w.asset || "UNITS";
      const amount = new Decimal(w.requested_amount || "0").abs();
      amountsByAsset[asset] = (amountsByAsset[asset] || new Decimal(0)).plus(amount);
      investorIds.add(w.investor_id);
      if (w.status === "cancelled" || w.status === "rejected") cancelledCount++;
      if (w.status === "completed") hasCompleted = true;
    }

    const formattedAmounts: Record<string, string> = {};
    for (const [asset, amount] of Object.entries(amountsByAsset)) {
      formattedAmounts[asset] = amount.toString();
    }

    return {
      count: selected.length,
      amountsByAsset: formattedAmounts,
      investorCount: investorIds.size,
      allCancelled: cancelledCount === selected.length,
      noneCancelled: cancelledCount === 0,
      hasCompleted,
    };
  }, [data, validSelectedIds]);

  return {
    selectedIds: validSelectedIds,
    toggleOne,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isIndeterminate,
    summary,
  };
}
