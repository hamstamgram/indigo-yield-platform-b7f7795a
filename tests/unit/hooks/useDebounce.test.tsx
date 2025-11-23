import { describe, it, expect, vi, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce string value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'updated', delay: 500 });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Value should now be updated
    expect(result.current).toBe('updated');
  });

  it('should debounce number value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 0 } }
    );

    rerender({ value: 100 });
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(100);
  });

  it('should reset debounce timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'v1' } }
    );

    rerender({ value: 'v2' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    rerender({ value: 'v3' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should still be initial value
    expect(result.current).toBe('v1');

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Now should be latest value
    expect(result.current).toBe('v3');
  });

  it('should use custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'test', delay: 1000 } }
    );

    rerender({ value: 'changed', delay: 1000 });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('test');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('changed');
  });

  it('should handle zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 0),
      { initialProps: { value: 'test' } }
    );

    rerender({ value: 'changed' });

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toBe('changed');
  });

  it('should handle object values', () => {
    const obj1 = { name: 'John', age: 30 };
    const obj2 = { name: 'Jane', age: 25 };

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: obj1 } }
    );

    expect(result.current).toEqual(obj1);

    rerender({ value: obj2 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toEqual(obj2);
  });

  it('should handle array values', () => {
    const arr1 = [1, 2, 3];
    const arr2 = [4, 5, 6];

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: arr1 } }
    );

    rerender({ value: arr2 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toEqual(arr2);
  });

  it('should cleanup timeout on unmount', () => {
    const { unmount } = renderHook(() => useDebounce('test', 500));

    unmount();

    // Should not throw error
    act(() => {
      vi.runAllTimers();
    });
  });

  it('should handle multiple rapid updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'v1' } }
    );

    // Rapid updates
    rerender({ value: 'v2' });
    rerender({ value: 'v3' });
    rerender({ value: 'v4' });
    rerender({ value: 'v5' });

    expect(result.current).toBe('v1');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should have only the last value
    expect(result.current).toBe('v5');
  });

  it('should work with boolean values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: false } }
    );

    rerender({ value: true });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(true);
  });

  it('should handle null and undefined', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: null as string | null } }
    );

    expect(result.current).toBe(null);

    rerender({ value: 'test' });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('test');

    rerender({ value: null as string | null });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(null);
  });
});
