/**
 * Transaction selection hook for bulk operations
 * Manages checkbox state, computes selection summary
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Decimal from "decimal.js";
import type { TransactionViewModel } from "@/types/domains/transaction";

export interface SelectionSummary {
  count: number;
  /** Amount totals grouped by asset, e.g. { BTC: "1.5", USDT: "3000" } */
  amountsByAsset: Record<string, string>;
  investorCount: number;
  hasSystemGenerated: boolean;
  /** True if every selected transaction is voided */
  allVoided: boolean;
  /** True if no selected transaction is voided */
  noneVoided: boolean;
}

interface UseTransactionSelectionReturn {
  selectedIds: Set<string>;
  toggleOne: (id: string) => void;
  toggleAll: () => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  summary: SelectionSummary;
}

/**
 * Get the list of transactions eligible for checkbox selection.
 * Non-voided rows always get a checkbox.
 * Voided rows only get a checkbox when showVoided is ON.
 */
function getSelectableRows(
  data: TransactionViewModel[],
  showVoided: boolean
): TransactionViewModel[] {
  if (showVoided) return data;
  return data.filter((tx) => !tx.isVoided);
}

export function useTransactionSelection(
  data: TransactionViewModel[],
  page: number,
  showVoided: boolean
): UseTransactionSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Clear selection on page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  // Intersect selection with new selectable set when showVoided toggles
  const prevShowVoided = useRef(showVoided);
  useEffect(() => {
    if (prevShowVoided.current === showVoided) return;
    prevShowVoided.current = showVoided;
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (selectableIds.has(id)) {
          next.add(id);
        }
      }
      return next;
    });
  }, [showVoided, selectableIds]);

  const selectableRows = useMemo(() => getSelectableRows(data, showVoided), [data, showVoided]);

  const selectableIds = useMemo(() => new Set(selectableRows.map((tx) => tx.id)), [selectableRows]);

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
      const allCurrentSelected =
        selectableRows.length > 0 && selectableRows.every((tx) => prev.has(tx.id));
      if (allCurrentSelected) {
        return new Set();
      }
      return new Set(selectableRows.map((tx) => tx.id));
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
    selectableRows.length > 0 && selectableRows.every((tx) => validSelectedIds.has(tx.id));

  const isIndeterminate = validSelectedIds.size > 0 && !isAllSelected;

  const summary = useMemo((): SelectionSummary => {
    const selected = data.filter((tx) => validSelectedIds.has(tx.id));
    if (selected.length === 0) {
      return {
        count: 0,
        amountsByAsset: {},
        investorCount: 0,
        hasSystemGenerated: false,
        allVoided: false,
        noneVoided: true,
      };
    }

    const amountsByAsset: Record<string, Decimal> = {};
    const investorIds = new Set<string>();
    let hasSystemGenerated = false;
    let voidedCount = 0;

    for (const tx of selected) {
      const asset = tx.asset;
      const amount = new Decimal(tx.amount || "0").abs();
      amountsByAsset[asset] = (amountsByAsset[asset] || new Decimal(0)).plus(amount);
      investorIds.add(tx.investorId);
      if (tx.isSystemGenerated) hasSystemGenerated = true;
      if (tx.isVoided) voidedCount++;
    }

    const formattedAmounts: Record<string, string> = {};
    for (const [asset, amount] of Object.entries(amountsByAsset)) {
      formattedAmounts[asset] = amount.toString();
    }

    return {
      count: selected.length,
      amountsByAsset: formattedAmounts,
      investorCount: investorIds.size,
      hasSystemGenerated,
      allVoided: voidedCount === selected.length,
      noneVoided: voidedCount === 0,
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
