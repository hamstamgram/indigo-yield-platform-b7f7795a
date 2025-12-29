/**
 * React Query Test Utilities
 * Reusable test infrastructure for hook testing
 */

import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

/**
 * Create a test-optimized QueryClient
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Create a wrapper component for renderHook
 */
export function createWrapper(queryClient?: QueryClient) {
  const client = queryClient || createTestQueryClient();
  
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {children}
      </QueryClientProvider>
    );
  };
}

/**
 * Mock user type for auth mocking
 */
export interface MockUser {
  id: string;
  email: string;
  role?: string;
}

/**
 * Create a mock for supabase.auth.getUser()
 */
export function mockSupabaseAuth(user: MockUser | null) {
  return {
    data: { user },
    error: null,
  };
}

/**
 * Create a fluent mock chain for Supabase queries
 */
export function createMockSupabaseChain<T>(
  data: T | null = null,
  error: Error | null = null,
  count: number | null = null
) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn((resolve) => resolve({ data, error, count })),
  };

  // Make the chain awaitable
  (chain as any)[Symbol.toStringTag] = "Promise";
  
  return chain;
}

/**
 * Create a mock Supabase client
 */
export function createMockSupabaseClient() {
  const chain = createMockSupabaseChain();
  
  return {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn(),
    _chain: chain,
  };
}

/**
 * Reset all mocks between tests
 */
export function resetAllMocks() {
  vi.clearAllMocks();
}

/**
 * Wait helper for async operations
 */
export async function waitForQueryToSettle(ms = 100) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
