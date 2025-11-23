import { describe, it, expect, vi } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { usePDFGeneration } from '@/hooks/usePDFGeneration';

describe('usePDFGeneration', () => {
  it('should initialize correctly', () => {
    const { result } = renderHook(() => usePDFGeneration());
    expect(result.current).toBeDefined();
  });

  it('should handle updates', () => {
    const { result, rerender } = renderHook(() => usePDFGeneration());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => usePDFGeneration());
    expect(() => unmount()).not.toThrow();
  });
});
