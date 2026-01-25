import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUserAssets } from "@/hooks/useUserAssets";

describe("useUserAssets", () => {
  it("should initialize correctly", () => {
    const { result } = renderHook(() => useUserAssets());
    expect(result.current).toBeDefined();
  });

  it("should handle updates", () => {
    const { result, rerender } = renderHook(() => useUserAssets());
    rerender();
    expect(result.current).toBeDefined();
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() => useUserAssets());
    expect(() => unmount()).not.toThrow();
  });
});
