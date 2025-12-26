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

// Fund management
export { fundService } from "./fundService";
export type { Fund, FundKPI } from "./fundService";

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

// Daily rates
export { dailyRatesService } from "./dailyRatesService";
export type { DailyRate } from "./dailyRatesService";

// System config
export { systemConfigService, defaultPlatformSettings } from "./systemConfigService";
export type { PlatformSettings } from "./systemConfigService";

// Yield rates
export { yieldRatesService } from "./yieldRatesService";
export type { Asset, YieldRate } from "./yieldRatesService";

// Investor data export
export { investorDataExportService } from "./investorDataExportService";
export type { InvestorExportData } from "./investorDataExportService";

// Fee schedule
export { feeScheduleService } from "./feeScheduleService";
export type { FeeScheduleRow, FeeHistoryRow } from "./feeScheduleService";

// Admin tools
export { adminToolsService } from "./adminToolsService";
export type { ToolResult } from "./adminToolsService";

// Statements
export { statementsService } from "./statementsService";
export type { StatementUpsertData, CreateStatementDocumentParams } from "./statementsService";

// Notifications
export { notificationService } from "./notificationService";
export type { Notification } from "./notificationService";

// Profile service
export { profileService } from "./profileService";
export type { ProfileSummary } from "./profileService";

// Fund daily AUM
export { fundDailyAumService } from "./fundDailyAumService";
export type { FundDailyAumRecord } from "./fundDailyAumService";

// Position service
export { positionService } from "./positionService";
export type { InvestorPosition, CreatePositionParams } from "./positionService";

// IB management
export { ibManagementService } from "./ibManagementService";

// Transactions V2 service (re-export from investor)
export { transactionsV2Service } from "@/services/investor/transactionsV2Service";

// Invite service
export { inviteService } from "./inviteService";
