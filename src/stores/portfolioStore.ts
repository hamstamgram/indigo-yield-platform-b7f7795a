import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface Position {
  id: string;
  symbol: string;
  quantity: number;
  average_cost: number;
  current_price: number;
  market_value: number;
  gain_loss: number;
  gain_percent: number;
  asset_type: string;
  last_updated: string;
}

interface PortfolioSummary {
  total_value: number;
  total_gain: number;
  total_gain_percent: number;
  day_change: number;
  day_change_percent: number;
  positions: Position[];
}

interface PortfolioState {
  summary: PortfolioSummary | null;
  positions: Position[];
  selectedPosition: Position | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface PortfolioActions {
  setSummary: (summary: PortfolioSummary) => void;
  setPositions: (positions: Position[]) => void;
  setSelectedPosition: (position: Position | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updatePosition: (positionId: string, updates: Partial<Position>) => void;
  addPosition: (position: Position) => void;
  removePosition: (positionId: string) => void;
  clearPortfolio: () => void;
  setLastUpdated: (date: Date) => void;
}

export const usePortfolioStore = create<PortfolioState & PortfolioActions>()(
  immer((set) => ({
    // State
    summary: null,
    positions: [],
    selectedPosition: null,
    loading: false,
    error: null,
    lastUpdated: null,

    // Actions
    setSummary: (summary) =>
      set((state) => {
        state.summary = summary;
        state.positions = summary.positions || [];
        state.lastUpdated = new Date();
      }),

    setPositions: (positions) =>
      set((state) => {
        state.positions = positions;
        if (state.summary) {
          state.summary.positions = positions;
        }
      }),

    setSelectedPosition: (position) =>
      set((state) => {
        state.selectedPosition = position;
      }),

    setLoading: (loading) =>
      set((state) => {
        state.loading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    updatePosition: (positionId, updates) =>
      set((state) => {
        const index = state.positions.findIndex((p) => p.id === positionId);
        if (index !== -1) {
          state.positions[index] = { ...state.positions[index], ...updates };
        }

        // Update in summary as well
        if (state.summary) {
          const summaryIndex = state.summary.positions.findIndex((p) => p.id === positionId);
          if (summaryIndex !== -1) {
            state.summary.positions[summaryIndex] = {
              ...state.summary.positions[summaryIndex],
              ...updates,
            };
          }
        }
      }),

    addPosition: (position) =>
      set((state) => {
        state.positions.push(position);
        if (state.summary) {
          state.summary.positions.push(position);
        }
      }),

    removePosition: (positionId) =>
      set((state) => {
        state.positions = state.positions.filter((p) => p.id !== positionId);
        if (state.summary) {
          state.summary.positions = state.summary.positions.filter((p) => p.id !== positionId);
        }
        if (state.selectedPosition?.id === positionId) {
          state.selectedPosition = null;
        }
      }),

    clearPortfolio: () =>
      set((state) => {
        state.summary = null;
        state.positions = [];
        state.selectedPosition = null;
        state.error = null;
        state.lastUpdated = null;
      }),

    setLastUpdated: (date) =>
      set((state) => {
        state.lastUpdated = date;
      }),
  }))
);

// Selectors for optimized component re-renders
export const usePortfolioSummary = () => usePortfolioStore((state) => state.summary);
export const usePositions = () => usePortfolioStore((state) => state.positions);
export const useSelectedPosition = () => usePortfolioStore((state) => state.selectedPosition);
export const usePortfolioLoading = () => usePortfolioStore((state) => state.loading);
export const usePortfolioError = () => usePortfolioStore((state) => state.error);
export const usePortfolioLastUpdated = () => usePortfolioStore((state) => state.lastUpdated);

// Computed selectors
export const useTopPositions = (limit: number = 5) =>
  usePortfolioStore((state) =>
    state.positions.sort((a, b) => b.market_value - a.market_value).slice(0, limit)
  );

export const usePositionsByType = (assetType?: string) =>
  usePortfolioStore((state) =>
    assetType ? state.positions.filter((p) => p.asset_type === assetType) : state.positions
  );
