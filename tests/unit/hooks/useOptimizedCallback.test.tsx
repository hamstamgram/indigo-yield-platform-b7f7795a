import { describe, it, expect, vi } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useOptimizedCallback } from '@/hooks/useOptimizedCallback';

describe('useOptimizedCallback', () => {
  it('should initialize correctly', () => {
    const { result } = renderHook(() => useOptimizedCallback());
    expect(result.current).toBeDefined();
  });

  it('should handle updates', () => {
    const { result, rerender } = renderHook(() => useOptimizedCallback());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useOptimizedCallback());
    expect(() => unmount()).not.toThrow();
  });
});
