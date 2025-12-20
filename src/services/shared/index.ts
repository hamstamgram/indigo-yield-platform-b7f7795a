/**
 * Shared Services - Re-exports cross-cutting services used across domains
 */

// Audit logging
export { auditLogService } from "./auditLogService";
export type { AuditLogEntry, AuditLogFilters } from "./auditLogService";

// Document management
export { documentService } from "./documentService";

// Asset management
export { assetService } from "./assetService";

// Performance services
export * from "./performanceService";
export * from "./performanceDataService";

// Historical data
export * from "./historicalDataService";

// IB (Introducing Broker) management
export * from "./ibService";

// Transaction service
export { fetchUserTransactions, calculateTransactionSummary, createAdminTransaction } from "./transactionService";
export type { Transaction, TransactionSummary } from "./transactionService";

// Email templates
export * from "./emailTemplates";
