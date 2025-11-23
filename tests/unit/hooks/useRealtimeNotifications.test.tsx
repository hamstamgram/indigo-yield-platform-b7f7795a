import { describe, it, expect, vi } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

describe('useRealtimeNotifications', () => {
  it('should initialize correctly', () => {
    const { result } = renderHook(() => useRealtimeNotifications());
    expect(result.current).toBeDefined();
  });

  it('should handle updates', () => {
    const { result, rerender } = renderHook(() => useRealtimeNotifications());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeNotifications());
    expect(() => unmount()).not.toThrow();
  });
});
