/**
 * Reports Module Index
 * Central export for all report-related functionality
 */

// Core engine
export { ReportEngine } from "./reportEngine";

// Generators - use lazy imports to reduce bundle size
// Import directly from ./pdfGenerator or ./excelGenerator when needed
// Or use the lazy wrappers from @/services/api/reportsApi.lazy

// Re-export types from domains
export * from "@/types/domains/report";

// Lazy loader utilities for dynamic imports
export const loadPDFGenerator = () => import("./pdfGenerator");
export const loadExcelGenerator = () => import("./excelGenerator");
