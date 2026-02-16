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

// Transaction service
export {
  fetchUserTransactions,
  calculateTransactionSummary,
  createTransactionWithCrystallization,
  createQuickTransaction,
  transactionService,
} from "./transactionService";
// Note: CreateTransactionParams should be imported from @/types/domains/transaction
export type {
  UserTransaction,
  UserTransactionSummary,
  UserTransactionSummary as TransactionSummary,
  QuickTransactionParams,
} from "./transactionService";
// For canonical transaction types, import directly from @/types/domains/transaction

// System config
export { systemConfigService, defaultPlatformSettings } from "./systemConfigService";
export type { PlatformSettings } from "./systemConfigService";

// Investor data export
export { investorDataExportService } from "./investorDataExportService";
export type { InvestorExportData } from "./investorDataExportService";

// Statements
export { statementsService } from "./statementsService";
export type { StatementUpsertData, CreateStatementDocumentParams } from "./statementsService";

// Notifications
export { notificationService } from "./notificationService";
export type { Notification } from "./notificationService";

// Profile service
export { profileService } from "./profileService";
export type { ProfileSummary, TransactionInvestor } from "./profileService";

// Fund daily AUM
export { fundDailyAumService } from "./fundDailyAumService";
export type { FundDailyAumRecord } from "./fundDailyAumService";

// Note: transactionsV2Service should be imported from @/services/investor

// Invite service
export { inviteService } from "./inviteService";

// Storage service (new)
export { storageService, type UploadResult } from "./storageService";

// Auth service (re-exported from canonical auth module)
export { getCurrentUser, getCurrentUserOptional } from "../auth/authService";
export type { CurrentUser } from "../auth/authService";
