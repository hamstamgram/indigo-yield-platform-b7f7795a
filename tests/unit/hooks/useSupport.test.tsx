import { describe, it, expect, vi } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useSupport } from '@/hooks/useSupport';

describe('useSupport', () => {
  it('should initialize correctly', () => {
    const { result } = renderHook(() => useSupport());
    expect(result.current).toBeDefined();
  });

  it('should handle updates', () => {
    const { result, rerender } = renderHook(() => useSupport());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useSupport());
    expect(() => unmount()).not.toThrow();
  });
});
