import { useState, useCallback } from "react";
import type { useActiveFundsWithAUM } from "@/hooks";

export type Fund = NonNullable<ReturnType<typeof useActiveFundsWithAUM>["data"]>[number];

export interface YieldSelectionState {
  selectedFund: Fund | null;
  showYieldDialog: boolean;
  showOpenPeriodDialog: boolean;
  showSystemAccounts: boolean;
  showOnlyChanged: boolean;
  searchInvestor: string;
}

export const initialSelectionState: YieldSelectionState = {
  selectedFund: null,
  showYieldDialog: false,
  showOpenPeriodDialog: false,
  showSystemAccounts: true,
  showOnlyChanged: false,
  searchInvestor: "",
};

export function useYieldSelection() {
  const [selection, setSelection] = useState<YieldSelectionState>(initialSelectionState);

  const setSelectedFund = useCallback((fund: Fund | null) => {
    setSelection((prev) => ({ ...prev, selectedFund: fund }));
  }, []);

  const setShowYieldDialog = useCallback((show: boolean) => {
    setSelection((prev) => ({ ...prev, showYieldDialog: show }));
  }, []);

  const setShowOpenPeriodDialog = useCallback((show: boolean) => {
    setSelection((prev) => ({ ...prev, showOpenPeriodDialog: show }));
  }, []);

  const setShowSystemAccounts = useCallback((show: boolean) => {
    setSelection((prev) => ({ ...prev, showSystemAccounts: show }));
  }, []);

  const setShowOnlyChanged = useCallback((show: boolean) => {
    setSelection((prev) => ({ ...prev, showOnlyChanged: show }));
  }, []);

  const setSearchInvestor = useCallback((search: string) => {
    setSelection((prev) => ({ ...prev, searchInvestor: search }));
  }, []);

  return {
    ...selection,
    setSelectedFund,
    setShowYieldDialog,
    setShowOpenPeriodDialog,
    setShowSystemAccounts,
    setShowOnlyChanged,
    setSearchInvestor,
    setSelection,
  };
}
