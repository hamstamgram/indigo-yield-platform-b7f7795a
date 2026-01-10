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

// Mock the report service - correct path
const mockGenerateFundPerformanceReports = vi.fn();

vi.mock("@/services/admin/reportQueryService", () => ({
  generateFundPerformanceReports: mockGenerateFundPerformanceReports,
  fetchAdminInvestorReports: vi.fn(),
  fetchInvestorPerformanceReports: vi.fn(),
  fetchPerformanceReportById: vi.fn(),
  fetchLatestPerformance: vi.fn(),
  fetchActiveInvestorsForStatements: vi.fn(),
}));

// Import from actual hook location after mocking
import { useGenerateFundPerformance } from "@/hooks/data";

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

    expect(mockGenerateFundPerformanceReports).toHaveBeenCalledWith(2024, 1);
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
    mockGenerateFundPerformanceReports.mockRejectedValue(new Error("403 Forbidden - ADMIN_REQUIRED"));

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
    mockGenerateFundPerformanceReports.mockRejectedValue(new Error("401 Unauthorized - token expired"));

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
