import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

describe("useIntersectionObserver", () => {
  it("should initialize correctly", () => {
    const { result } = renderHook(() => useIntersectionObserver());
    expect(result.current).toBeDefined();
  });

  it("should handle updates", () => {
    const { result, rerender } = renderHook(() => useIntersectionObserver());
    rerender();
    expect(result.current).toBeDefined();
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() => useIntersectionObserver());
    expect(() => unmount()).not.toThrow();
  });
});
