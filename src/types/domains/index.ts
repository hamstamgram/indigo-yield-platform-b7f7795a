/**
 * Domain Types - Central Export
 * Clean, domain-specific type abstractions
 */

// Re-export all domain types
export * from './investor';
export * from './transaction';
export * from './portfolio';
export * from './fund';
export * from './report';
export * from './document';

// Common utility types
export type AsyncResult<T> = {
  data: T | null;
  error: Error | null;
  loading: boolean;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  order: SortOrder;
}

export interface FilterConfig {
  [key: string]: string | number | boolean | null | undefined;
}
