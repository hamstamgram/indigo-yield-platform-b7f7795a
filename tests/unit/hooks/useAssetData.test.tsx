import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAssetData } from "@/hooks/useAssetData";

describe("useAssetData", () => {
  it("should initialize correctly", () => {
    const { result } = renderHook(() => useAssetData());
    expect(result.current).toBeDefined();
  });

  it("should handle updates", () => {
    const { result, rerender } = renderHook(() => useAssetData());
    rerender();
    expect(result.current).toBeDefined();
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() => useAssetData());
    expect(() => unmount()).not.toThrow();
  });
});
