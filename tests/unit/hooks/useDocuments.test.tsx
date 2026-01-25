import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDocuments } from "@/hooks/useDocuments";

describe("useDocuments", () => {
  it("should initialize correctly", () => {
    const { result } = renderHook(() => useDocuments());
    expect(result.current).toBeDefined();
  });

  it("should handle updates", () => {
    const { result, rerender } = renderHook(() => useDocuments());
    rerender();
    expect(result.current).toBeDefined();
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() => useDocuments());
    expect(() => unmount()).not.toThrow();
  });
});
