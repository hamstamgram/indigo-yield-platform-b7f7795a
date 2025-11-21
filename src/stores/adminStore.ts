import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalPortfolioValue: number;
  totalTransactions: number;
  newUsersThisMonth: number;
  systemHealth: "good" | "warning" | "critical";
}

interface User {
  id: string;
  email: string;
  name?: string;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  last_sign_in: string;
  is_admin: boolean;
}

interface SystemAlert {
  id: string;
  type: "info" | "warning" | "error";
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface AdminState {
  metrics: AdminMetrics | null;
  users: User[];
  selectedUser: User | null;
  systemAlerts: SystemAlert[];
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

interface AdminActions {
  setMetrics: (metrics: AdminMetrics) => void;
  setUsers: (users: User[]) => void;
  setSelectedUser: (user: User | null) => void;
  setSystemAlerts: (alerts: SystemAlert[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  addSystemAlert: (alert: Omit<SystemAlert, "id" | "timestamp" | "acknowledged">) => void;
  acknowledgeAlert: (alertId: string) => void;
  clearAlerts: () => void;
  clearAdminData: () => void;
  setLastRefresh: (date: Date) => void;
}

export const useAdminStore = create<AdminState & AdminActions>()(
  immer((set) => ({
    // State
    metrics: null,
    users: [],
    selectedUser: null,
    systemAlerts: [],
    loading: false,
    error: null,
    lastRefresh: null,

    // Actions
    setMetrics: (metrics) =>
      set((state) => {
        state.metrics = metrics;
        state.lastRefresh = new Date();
      }),

    setUsers: (users) =>
      set((state) => {
        state.users = users;
      }),

    setSelectedUser: (user) =>
      set((state) => {
        state.selectedUser = user;
      }),

    setSystemAlerts: (alerts) =>
      set((state) => {
        state.systemAlerts = alerts;
      }),

    setLoading: (loading) =>
      set((state) => {
        state.loading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    updateUser: (userId, updates) =>
      set((state) => {
        const index = state.users.findIndex((u) => u.id === userId);
        if (index !== -1) {
          state.users[index] = { ...state.users[index], ...updates };
        }

        if (state.selectedUser?.id === userId) {
          state.selectedUser = { ...state.selectedUser, ...updates };
        }
      }),

    addUser: (user) =>
      set((state) => {
        state.users.unshift(user); // Add to beginning for recent users first
      }),

    removeUser: (userId) =>
      set((state) => {
        state.users = state.users.filter((u) => u.id !== userId);
        if (state.selectedUser?.id === userId) {
          state.selectedUser = null;
        }
      }),

    addSystemAlert: (alert) =>
      set((state) => {
        const newAlert: SystemAlert = {
          ...alert,
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          acknowledged: false,
        };
        state.systemAlerts.unshift(newAlert);
      }),

    acknowledgeAlert: (alertId) =>
      set((state) => {
        const alert = state.systemAlerts.find((a) => a.id === alertId);
        if (alert) {
          alert.acknowledged = true;
        }
      }),

    clearAlerts: () =>
      set((state) => {
        state.systemAlerts = [];
      }),

    clearAdminData: () =>
      set((state) => {
        state.metrics = null;
        state.users = [];
        state.selectedUser = null;
        state.systemAlerts = [];
        state.error = null;
        state.lastRefresh = null;
      }),

    setLastRefresh: (date) =>
      set((state) => {
        state.lastRefresh = date;
      }),
  }))
);

// Selectors for optimized component re-renders
export const useAdminMetrics = () => useAdminStore((state) => state.metrics);
export const useAdminUsers = () => useAdminStore((state) => state.users);
export const useSelectedUser = () => useAdminStore((state) => state.selectedUser);
export const useSystemAlerts = () => useAdminStore((state) => state.systemAlerts);
export const useAdminLoading = () => useAdminStore((state) => state.loading);
export const useAdminError = () => useAdminStore((state) => state.error);
export const useLastRefresh = () => useAdminStore((state) => state.lastRefresh);

// Computed selectors
export const useUnacknowledgedAlerts = () =>
  useAdminStore((state) => state.systemAlerts.filter((alert) => !alert.acknowledged));

export const useCriticalAlerts = () =>
  useAdminStore((state) =>
    state.systemAlerts.filter((alert) => alert.type === "error" && !alert.acknowledged)
  );

export const useActiveUsers = () =>
  useAdminStore((state) => state.users.filter((user) => user.status === "active"));

export const useAdminUsersOnly = () =>
  useAdminStore((state) => state.users.filter((user) => user.is_admin));
