/**
 * Report selection hook for bulk operations
 * Manages checkbox state, computes selection summary
 */

import { useState, useCallback, useEffect, useMemo } from "react";

export interface HistoricalReport {
  id: string;
  investor_id: string;
  investor_name: string;
  period_month: string;
  fund_names: string[];
  delivery_status: string;
  sent_at: string | null;
  created_at: string;
}

export interface ReportSelectionSummary {
  count: number;
  investorCount: number;
  /** Unique period months in selection */
  periods: string[];
}

interface UseReportSelectionReturn {
  selectedIds: Set<string>;
  toggleOne: (id: string) => void;
  toggleAll: () => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  summary: ReportSelectionSummary;
}

export function useReportSelection(
  data: HistoricalReport[],
  page: number
): UseReportSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Clear selection on page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  const selectableIds = useMemo(() => new Set(data.map((r) => r.id)), [data]);

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
      const allSelected = data.length > 0 && data.every((r) => prev.has(r.id));
      if (allSelected) {
        return new Set();
      }
      return new Set(data.map((r) => r.id));
    });
  }, [data]);

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

  const isAllSelected = data.length > 0 && data.every((r) => validSelectedIds.has(r.id));

  const isIndeterminate = validSelectedIds.size > 0 && !isAllSelected;

  const summary = useMemo((): ReportSelectionSummary => {
    const selected = data.filter((r) => validSelectedIds.has(r.id));
    if (selected.length === 0) {
      return { count: 0, investorCount: 0, periods: [] };
    }

    const investorIds = new Set<string>();
    const periods = new Set<string>();

    for (const r of selected) {
      investorIds.add(r.investor_id);
      periods.add(r.period_month);
    }

    return {
      count: selected.length,
      investorCount: investorIds.size,
      periods: Array.from(periods).sort(),
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
