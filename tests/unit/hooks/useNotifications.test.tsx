import { describe, it, expect, vi } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useNotifications } from '@/hooks/useNotifications';

describe('useNotifications', () => {
  it('should initialize correctly', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current).toBeDefined();
  });

  it('should handle updates', () => {
    const { result, rerender } = renderHook(() => useNotifications());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useNotifications());
    expect(() => unmount()).not.toThrow();
  });
});
