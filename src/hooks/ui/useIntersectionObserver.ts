import { useEffect, useRef, useState } from "react";

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  /**
   * Whether to freeze the observer after first intersection
   * @default false
   */
  freezeOnceVisible?: boolean;
}

/**
 * Hook for observing element visibility using Intersection Observer API
 * Useful for lazy loading, infinite scroll, and analytics
 *
 * @param options - Intersection Observer options
 * @returns Ref to attach to element and intersection entry
 *
 * @example
 * const { ref, entry, isIntersecting } = useIntersectionObserver({
 *   threshold: 0.5,
 *   freezeOnceVisible: true
 * });
 *
 * return <div ref={ref}>{isIntersecting && <HeavyComponent />}</div>;
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLDivElement>(
  options: UseIntersectionObserverOptions = {}
) {
  const { freezeOnceVisible = false, ...observerOptions } = options;
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef<T>(null);
  const frozen = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    const hasIOSupport = typeof window !== "undefined" && "IntersectionObserver" in window;

    if (!hasIOSupport || !element) {
      return;
    }

    // Don't create observer if already frozen
    if (frozen.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry);
        setIsIntersecting(entry.isIntersecting);

        if (freezeOnceVisible && entry.isIntersecting) {
          frozen.current = true;
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
        ...observerOptions,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [freezeOnceVisible, observerOptions]);

  return {
    ref: elementRef,
    entry,
    isIntersecting,
  };
}
