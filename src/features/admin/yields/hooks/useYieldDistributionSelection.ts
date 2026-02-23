/**
 * Yield Distribution selection hook for bulk operations
 * Manages checkbox state for distribution rows
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import type { DistributionRow } from "@/services/admin/yields/yieldDistributionsPageService";

export interface YieldSelectionSummary {
  count: number;
  allVoided: boolean;
  noneVoided: boolean;
}

interface UseYieldDistributionSelectionReturn {
  selectedIds: Set<string>;
  toggleOne: (id: string) => void;
  toggleAll: () => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  summary: YieldSelectionSummary;
}

export function useYieldDistributionSelection(
  data: DistributionRow[],
  includeVoided: boolean
): UseYieldDistributionSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Clear selection on includeVoided toggle
  useEffect(() => {
    setSelectedIds(new Set());
  }, [includeVoided]);

  const selectableRows = useMemo(() => {
    if (includeVoided) return data;
    return data.filter((d) => !d.is_voided);
  }, [data, includeVoided]);

  const selectableIds = useMemo(() => new Set(selectableRows.map((d) => d.id)), [selectableRows]);

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
        selectableRows.length > 0 && selectableRows.every((d) => prev.has(d.id));
      if (allCurrentSelected) {
        return new Set();
      }
      return new Set(selectableRows.map((d) => d.id));
    });
  }, [selectableRows]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

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
    selectableRows.length > 0 && selectableRows.every((d) => validSelectedIds.has(d.id));

  const isIndeterminate = validSelectedIds.size > 0 && !isAllSelected;

  const summary = useMemo((): YieldSelectionSummary => {
    const selected = data.filter((d) => validSelectedIds.has(d.id));
    if (selected.length === 0) {
      return {
        count: 0,
        allVoided: false,
        noneVoided: true,
      };
    }

    let voidedCount = 0;
    for (const d of selected) {
      if (d.is_voided) voidedCount++;
    }

    return {
      count: selected.length,
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
