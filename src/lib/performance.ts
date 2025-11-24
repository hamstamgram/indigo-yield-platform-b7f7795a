/**
 * Performance optimization utilities for React components
 * Includes memoization helpers, lazy loading, and caching strategies
 */

import { lazy, ComponentType } from "react";

/**
 * Enhanced lazy loading with prefetch support
 * @param factory - Dynamic import function
 * @param prefetch - Whether to prefetch on hover
 */
export function lazyWithPrefetch<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  prefetch = true
) {
  const LazyComponent = lazy(factory);

  if (prefetch && typeof window !== "undefined") {
    // Prefetch on mouse over for better UX
    const prefetchComponent = () => {
      factory();
    };

    (LazyComponent as any).prefetch = prefetchComponent;
  }

  return LazyComponent;
}

/**
 * Debounce function for performance optimization
 * @param func - Function to debounce
 * @param wait - Delay in milliseconds
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 * @param func - Function to throttle
 * @param limit - Minimum time between executions
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Simple memoization for expensive computations
 * @param fn - Function to memoize
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>();

  return (...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * LRU (Least Recently Used) Cache implementation
 * Useful for caching API responses or computed values
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add to end
    this.cache.set(key, value);

    // Remove oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Intersection Observer hook for lazy loading images/components
 */
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): IntersectionObserver | null {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    return null;
  }

  return new IntersectionObserver(callback, {
    root: null,
    rootMargin: "50px",
    threshold: 0.01,
    ...options,
  });
}

/**
 * Performance metrics tracker
 */
export class PerformanceTracker {
  private marks: Map<string, number> = new Map();

  mark(name: string): void {
    if (typeof window !== "undefined" && window.performance) {
      this.marks.set(name, performance.now());
    }
  }

  measure(name: string, startMark: string): number | null {
    if (typeof window !== "undefined" && window.performance) {
      const startTime = this.marks.get(startMark);
      if (startTime !== undefined) {
        const duration = performance.now() - startTime;
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
        return duration;
      }
    }
    return null;
  }

  clear(): void {
    this.marks.clear();
  }
}

/**
 * Utility to batch multiple state updates
 * Useful for avoiding unnecessary re-renders
 */
export function batchUpdates<T>(
  updates: Array<() => T>
): Promise<T[]> {
  return Promise.all(updates.map((update) => Promise.resolve(update())));
}

/**
 * Virtual scrolling helper for large lists
 * Calculates visible items based on scroll position
 */
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 3
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(totalItems, start + visibleCount + overscan * 2);

  return { start, end };
}

/**
 * Image optimization helper
 * Returns optimized image URL based on device pixel ratio
 */
export function getOptimizedImageUrl(
  baseUrl: string,
  width: number,
  quality: number = 85
): string {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const optimizedWidth = Math.round(width * dpr);

  // Next.js Image Optimization API
  return `/api/image?url=${encodeURIComponent(baseUrl)}&w=${optimizedWidth}&q=${quality}`;
}

/**
 * Web Vitals reporter
 * Reports Core Web Vitals metrics
 */
export function reportWebVitals(metric: {
  id: string;
  name: string;
  value: number;
  label: "web-vital" | "custom";
}): void {
  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value);
  }

  // In production, send to analytics
  if (process.env.NODE_ENV === "production" && typeof window !== "undefined") {
    // Send to analytics service
    if ((window as any).gtag) {
      (window as any).gtag("event", metric.name, {
        event_category: metric.label === "web-vital" ? "Web Vitals" : "Custom",
        value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true,
      });
    }
  }
}

/**
 * Preload resources for better performance
 * @param href - Resource URL
 * @param as - Resource type (script, style, font, etc.)
 */
export function preloadResource(
  href: string,
  as: "script" | "style" | "font" | "image" = "script"
): void {
  if (typeof window === "undefined") return;

  const link = document.createElement("link");
  link.rel = "preload";
  link.href = href;
  link.as = as;

  if (as === "font") {
    link.crossOrigin = "anonymous";
  }

  document.head.appendChild(link);
}

/**
 * Prefetch resources for next navigation
 * @param href - Resource URL
 */
export function prefetchResource(href: string): void {
  if (typeof window === "undefined") return;

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = href;

  document.head.appendChild(link);
}

/**
 * Bundle size analyzer helper
 * Logs component bundle size in development
 */
export function logBundleSize(componentName: string, size?: number): void {
  if (process.env.NODE_ENV === "development") {
    const actualSize = size || 0;
    console.log(
      `[Bundle] ${componentName}: ${(actualSize / 1024).toFixed(2)}KB`
    );
  }
}

// Export performance tracker instance
export const performanceTracker = new PerformanceTracker();
