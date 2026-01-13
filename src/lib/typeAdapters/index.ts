/**
 * Type Adapters - Transform between Supabase DB types and Application types
 * This layer bridges the gap between database schema and application domain models
 * 
 * CANONICAL TYPE SOURCES:
 * - Fund, FundRef, FundStatus → @/types/domains/fund
 * - InvestorPosition, Investor → @/types/domains/investor
 * - Transaction, TransactionType → @/types/domains/transaction
 * - Document, DocumentType → @/types/domains/document
 * - Notification → @/types/domains/notification
 * - Session, AccessLog → @/types/domains/session
 * - Report, ReportType → @/types/domains/report
 */

export * from "./documentAdapter";
export * from "./investorAdapter";
export * from "./notificationAdapter";
