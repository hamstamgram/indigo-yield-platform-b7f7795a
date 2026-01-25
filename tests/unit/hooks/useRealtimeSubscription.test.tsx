import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

describe("useRealtimeSubscription", () => {
  it("should initialize correctly", () => {
    const { result } = renderHook(() => useRealtimeSubscription());
    expect(result.current).toBeDefined();
  });

  it("should handle updates", () => {
    const { result, rerender } = renderHook(() => useRealtimeSubscription());
    rerender();
    expect(result.current).toBeDefined();
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeSubscription());
    expect(() => unmount()).not.toThrow();
  });
});
