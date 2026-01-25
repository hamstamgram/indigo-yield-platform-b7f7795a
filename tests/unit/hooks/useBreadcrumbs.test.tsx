import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

describe("useBreadcrumbs", () => {
  it("should initialize correctly", () => {
    const { result } = renderHook(() => useBreadcrumbs());
    expect(result.current).toBeDefined();
  });

  it("should handle updates", () => {
    const { result, rerender } = renderHook(() => useBreadcrumbs());
    rerender();
    expect(result.current).toBeDefined();
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() => useBreadcrumbs());
    expect(() => unmount()).not.toThrow();
  });
});
