/**
 * Statement-related admin hooks - Re-exports from features/admin
 */

export * from "@/features/admin/reports/hooks/useStatementData";
export {
  useActiveInvestorsForStatements as useStatementsPageInvestors,
  useStatementDocuments,
  useGenerateStatement as useGenerateStatementMutation,
  useSendStatementEmail,
} from "@/features/admin/reports/hooks/useAdminStatementsPage";

// Note: useLockedPeriods removed in P1-03 (Unify AUM Snapshot Tables)
// The fund_period_snapshot table was unused (0 rows) and has been dropped.
