import { describe, it, expect, vi } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useInvestorSearch } from '@/hooks/useInvestorSearch';

describe('useInvestorSearch', () => {
  it('should initialize correctly', () => {
    const { result } = renderHook(() => useInvestorSearch());
    expect(result.current).toBeDefined();
  });

  it('should handle updates', () => {
    const { result, rerender } = renderHook(() => useInvestorSearch());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useInvestorSearch());
    expect(() => unmount()).not.toThrow();
  });
});
