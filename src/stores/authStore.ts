import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  error: string | null;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      session: null,
      loading: true,
      isAdmin: false,
      error: null,

      // Actions
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),
      setIsAdmin: (isAdmin) => set({ isAdmin }),
      setError: (error) => set({ error }),
      clearAuth: () => set({
        user: null,
        session: null,
        loading: false,
        isAdmin: false,
        error: null
      }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAdmin: state.isAdmin
      }),
    }
  )
);

// Selectors for optimized component re-renders
export const useUser = () => useAuthStore((state) => state.user);
export const useSession = () => useAuthStore((state) => state.session);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useIsAdmin = () => useAuthStore((state) => state.isAdmin);
export const useAuthError = () => useAuthStore((state) => state.error);