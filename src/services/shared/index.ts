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

// Fund management - DEPRECATED: Use @/services/admin/fundService instead
// Re-export from admin for backward compatibility
export { fundService } from "../admin/fundService";
// Note: Fund, FundRef, FundStatus should be imported from @/types/domains/fund
// Note: FundKPI, DailyNav, CreateFundInput should be imported from @/services/admin/fundService

// Performance services
export * from "./performanceService";
export * from "./performanceDataService";

// Historical data
export * from "./historicalDataService";

// IB (Introducing Broker) - DEPRECATED: Use @/services/ib instead
// Re-export from consolidated ib/ module for backward compatibility
export * from "../ib/config";
export * from "../ib/referrals";

// Transaction service
export { 
  fetchUserTransactions, 
  calculateTransactionSummary, 
  createAdminTransaction,
  createQuickTransaction,
  transactionService,
} from "./transactionService";
// Note: CreateTransactionParams should be imported from @/types/domains/transaction
export type { 
  UserTransaction,
  TransactionSummary, 
  QuickTransactionParams,
} from "./transactionService";
// For canonical transaction types, import directly from @/types/domains/transaction

// Email templates
export * from "./emailTemplates";


// System config
export { systemConfigService, defaultPlatformSettings } from "./systemConfigService";
export type { PlatformSettings } from "./systemConfigService";

// Yield rates - DEPRECATED: Use @/services/admin/yieldRatesService instead
export { yieldRatesService } from "../admin/yieldRatesService";
export type { Asset, YieldRate } from "../admin/yieldRatesService";

// Investor data export
export { investorDataExportService } from "./investorDataExportService";
export type { InvestorExportData } from "./investorDataExportService";

// Fee schedule - DEPRECATED: Use @/services/admin/feeScheduleService instead
export { feeScheduleService } from "../admin/feeScheduleService";
export type { FeeScheduleRow, FeeHistoryRow } from "../admin/feeScheduleService";

// Admin tools - DEPRECATED: Use @/services/admin/adminToolsService instead
export { adminToolsService } from "../admin/adminToolsService";
export type { ToolResult } from "../admin/adminToolsService";

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

// Position service - REMOVED: Use @/services/investor/investorPositionService instead
// Migration guide:
// - positionService.getPositionsByFund() -> import { getPositionsByFund } from "@/services/investor"
// - positionService.getPositionsByInvestor() -> import { getInvestorPositions } from "@/services/investor"
// - InvestorPosition type -> import from "@/types/domains/investor"

// IB management - DEPRECATED: Use @/services/ib instead
export { ibManagementService } from "../ib/management";

// Note: transactionsV2Service should be imported from @/services/investor

// Invite service
export { inviteService } from "./inviteService";

// Storage service (new)
export { storageService, type UploadResult } from "./storageService";
