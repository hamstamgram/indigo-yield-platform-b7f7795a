/**
 * Domain Types - Central Export
 * CANONICAL SOURCE for all domain-specific type abstractions
 * 
 * Usage:
 * import { Investor, Transaction, Fund } from "@/types/domains";
 */

// ============================================================================
// Core Domain Types - Import from here!
// ============================================================================

// Investor domain
export * from "./investor";

// Transaction domain
export * from "./transaction";

// Portfolio domain
export * from "./portfolio";

// Fund domain
export * from "./fund";

// Report domain
export * from "./report";

// Document domain
export * from "./document";

// Delivery domain
export * from "./delivery";

// Integrity domain
export * from "./integrity";

// ============================================================================
// Common Utility Types
// ============================================================================

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

export type SortOrder = "asc" | "desc";

export interface SortConfig {
  field: string;
  order: SortOrder;
}

export interface FilterConfig {
  [key: string]: string | number | boolean | null | undefined;
}

// ============================================================================
// Status Types
// ============================================================================

export type EntityStatus = "active" | "inactive" | "pending" | "closed" | "suspended";

// ============================================================================
// ID Reference Types
// ============================================================================

export interface IdRef {
  id: string;
}

export interface NamedRef extends IdRef {
  name: string;
}

export interface EmailRef extends NamedRef {
  email: string;
}
