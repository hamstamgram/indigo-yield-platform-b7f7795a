import { describe, it, expect, vi } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useInvestors } from '@/hooks/useInvestors';

describe('useInvestors', () => {
  it('should initialize correctly', () => {
    const { result } = renderHook(() => useInvestors());
    expect(result.current).toBeDefined();
  });

  it('should handle updates', () => {
    const { result, rerender } = renderHook(() => useInvestors());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useInvestors());
    expect(() => unmount()).not.toThrow();
  });
});
