/**
 * useUrlFilters Hook
 * Persists filter state in URL search params for shareable, bookmarkable filtered views
 */

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export interface UseUrlFiltersOptions {
  /** Keys to track in URL. If not provided, all params are tracked */
  keys?: string[];
  /** Default values for filters (used when resetting) */
  defaults?: Record<string, string>;
}

export function useUrlFilters<T extends Record<string, string | undefined> = Record<string, string>>(
  options: UseUrlFiltersOptions = {}
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { keys, defaults = {} } = options;

  // Extract current filter values from URL
  const filters = useMemo(() => {
    const obj: Record<string, string> = {};
    
    if (keys) {
      // Only extract specified keys
      keys.forEach((key) => {
        const value = searchParams.get(key);
        if (value !== null) {
          obj[key] = value;
        } else if (defaults[key]) {
          obj[key] = defaults[key];
        }
      });
    } else {
      // Extract all params
      searchParams.forEach((value, key) => {
        obj[key] = value;
      });
    }
    
    return obj as T;
  }, [searchParams, keys, defaults]);

  // Set a single filter value
  const setFilter = useCallback(
    (key: string, value: string | undefined | null) => {
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);
          
          // Remove if value is empty, null, undefined, or "all" (common reset value)
          if (!value || value === "all" || value === "") {
            newParams.delete(key);
          } else {
            newParams.set(key, value);
          }
          
          return newParams;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Set multiple filters at once
  const setFilters = useCallback(
    (newFilters: Record<string, string | undefined | null>) => {
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);
          
          Object.entries(newFilters).forEach(([key, value]) => {
            if (!value || value === "all" || value === "") {
              newParams.delete(key);
            } else {
              newParams.set(key, value);
            }
          });
          
          return newParams;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Clear all filters (or reset to defaults)
  const clearFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const newParams = new URLSearchParams();
        
        // Keep any params not in our tracked keys
        if (keys) {
          prev.forEach((value, key) => {
            if (!keys.includes(key)) {
              newParams.set(key, value);
            }
          });
        }
        
        // Apply defaults
        Object.entries(defaults).forEach(([key, value]) => {
          if (value) {
            newParams.set(key, value);
          }
        });
        
        return newParams;
      },
      { replace: true }
    );
  }, [setSearchParams, keys, defaults]);

  // Get a single filter value with fallback
  const getFilter = useCallback(
    (key: string, fallback?: string): string => {
      return searchParams.get(key) ?? defaults[key] ?? fallback ?? "";
    },
    [searchParams, defaults]
  );

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    if (keys) {
      return keys.some((key) => {
        const value = searchParams.get(key);
        return value && value !== "all" && value !== defaults[key];
      });
    }
    return searchParams.toString().length > 0;
  }, [searchParams, keys, defaults]);

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    getFilter,
    hasActiveFilters,
    searchParams,
    setSearchParams,
  };
}

export default useUrlFilters;
