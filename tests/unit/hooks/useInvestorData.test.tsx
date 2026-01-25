import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInvestorData } from "@/hooks/useInvestorData";

describe("useInvestorData", () => {
  it("should initialize correctly", () => {
    const { result } = renderHook(() => useInvestorData());
    expect(result.current).toBeDefined();
  });

  it("should handle updates", () => {
    const { result, rerender } = renderHook(() => useInvestorData());
    rerender();
    expect(result.current).toBeDefined();
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() => useInvestorData());
    expect(() => unmount()).not.toThrow();
  });
});
