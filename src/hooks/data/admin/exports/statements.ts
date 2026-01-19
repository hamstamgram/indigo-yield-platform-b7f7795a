/**
 * Statement-related admin hooks
 */

// useStatementData
export { 
  useStatementPeriods, 
  useGeneratedStatements,
  useInvestorStatements,
  useDeleteStatement,
  usePeriodStatementCount,
  type GeneratedStatement,
  type StatementPeriod,
  type StatementFilters,
} from "../useStatementData";

// useAdminStatementsPage
export {
  useActiveInvestorsForStatements as useStatementsPageInvestors,
  useStatementDocuments,
  useGenerateStatement as useGenerateStatementMutation,
  useSendStatementEmail,
} from "../useAdminStatementsPage";

// Note: useLockedPeriods removed in P1-03 (Unify AUM Snapshot Tables)
// The fund_period_snapshot table was unused (0 rows) and has been dropped.
