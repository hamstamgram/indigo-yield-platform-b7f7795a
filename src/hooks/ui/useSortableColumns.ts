import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

export function useSortableColumns<T>(
  data: T[],
  defaultSort?: SortConfig,
  tiebreakerKey: string = "created_at"
) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(
    defaultSort || { column: '', direction: null }
  );

  const requestSort = (column: string) => {
    setSortConfig((prevConfig) => {
      if (prevConfig.column === column) {
        // Cycle through: asc -> desc -> null
        if (prevConfig.direction === 'asc') {
          return { column, direction: 'desc' };
        }
        if (prevConfig.direction === 'desc') {
          return { column: '', direction: null };
        }
      }
      // New column or reset
      return { column, direction: 'asc' };
    });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.column);
      const bValue = getNestedValue(b, sortConfig.column);

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

      // Handle dates
      if (typeof aValue === 'string' && isDateString(aValue) && 
          typeof bValue === 'string' && isDateString(bValue)) {
        const aDate = new Date(aValue).getTime();
        const bDate = new Date(bValue).getTime();
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
      }

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle strings
      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();
      
      if (aString < bString) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aString > bString) return sortConfig.direction === 'asc' ? 1 : -1;

      // Tiebreaker: sort by secondary key descending (newest first)
      const aTie = getNestedValue(a, tiebreakerKey);
      const bTie = getNestedValue(b, tiebreakerKey);
      if (aTie != null && bTie != null) {
        if (typeof aTie === 'string' && typeof bTie === 'string') {
          return bTie.localeCompare(aTie);
        }
        if (typeof aTie === 'number' && typeof bTie === 'number') {
          return bTie - aTie;
        }
      }
      return 0;
    });
  }, [data, sortConfig, tiebreakerKey]);

  return {
    sortConfig,
    requestSort,
    sortedData,
  };
}

// Helper to get nested object values (e.g., "profiles.first_name")
function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let value: unknown = obj;
  
  for (const key of keys) {
    if (value == null || typeof value !== 'object') return null;
    value = (value as Record<string, unknown>)[key];
  }
  
  return value;
}

// Check if a string looks like a date
function isDateString(str: string): boolean {
  if (str.length < 10) return false;
  const date = new Date(str);
  return !isNaN(date.getTime());
}
