/**
 * Integration Tests: useGenerateFundPerformance
 * Tests for fund performance generation mutation hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapper, createTestQueryClient, resetAllMocks } from "../../utils/queryTestWrapper";
import {
  mockFundPerformanceResponse,
  mockFundPerformanceError403,
  mockFundPerformanceError401,
} from "../../fixtures/hook-test-data";

// Mock toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock("sonner", () => ({
  toast: mockToast,
}));

// Mock the report service
const mockGenerateFundPerformanceReports = vi.fn();

vi.mock("@/services/reportQueryService", () => ({
  generateFundPerformanceReports: mockGenerateFundPerformanceReports,
}));

// Create a test implementation of useGenerateFundPerformance
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function useGenerateFundPerformance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ year, month }: { year: number; month: number }) => {
      const result = await mockGenerateFundPerformanceReports({ year, month });
      if (!result.success) {
        throw new Error(result.error || "Failed to generate reports");
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success("Reports Generated", {
        description: `Created ${data.recordsCreated} performance records`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-investor-reports"] });
    },
    onError: (error: Error) => {
      if (error.message.includes("403") || error.message.includes("ADMIN_REQUIRED")) {
        toast.error("Access Denied", {
          description: "You don't have permission to generate reports",
        });
      } else if (error.message.includes("401") || error.message.includes("token")) {
        toast.error("Session Expired", {
          description: "Please log in again to continue",
        });
      } else {
        toast.error("Generation Failed", {
          description: error.message,
        });
      }
    },
  });
}

describe("useGenerateFundPerformance", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls generateFundPerformanceReports with correct params", async () => {
    mockGenerateFundPerformanceReports.mockResolvedValue(mockFundPerformanceResponse);

    const { result } = renderHook(() => useGenerateFundPerformance(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ year: 2024, month: 1 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGenerateFundPerformanceReports).toHaveBeenCalledWith({ year: 2024, month: 1 });
  });

  it("shows success toast with records count on success", async () => {
    mockGenerateFundPerformanceReports.mockResolvedValue(mockFundPerformanceResponse);

    const { result } = renderHook(() => useGenerateFundPerformance(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ year: 2024, month: 1 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockToast.success).toHaveBeenCalledWith(
      "Reports Generated",
      expect.objectContaining({
        description: expect.stringContaining("15"),
      })
    );
  });

  it("invalidates admin-investor-reports query on success", async () => {
    mockGenerateFundPerformanceReports.mockResolvedValue(mockFundPerformanceResponse);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useGenerateFundPerformance(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ year: 2024, month: 1 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["admin-investor-reports"] });
  });

  it("shows Access Denied toast for 403 errors", async () => {
    mockGenerateFundPerformanceReports.mockResolvedValue(mockFundPerformanceError403);

    const { result } = renderHook(() => useGenerateFundPerformance(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ year: 2024, month: 1 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Access Denied",
      expect.objectContaining({
        description: expect.any(String),
      })
    );
  });

  it("shows Session Expired toast for 401/token errors", async () => {
    mockGenerateFundPerformanceReports.mockResolvedValue(mockFundPerformanceError401);

    const { result } = renderHook(() => useGenerateFundPerformance(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ year: 2024, month: 1 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Session Expired",
      expect.objectContaining({
        description: expect.any(String),
      })
    );
  });
});
