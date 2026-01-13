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

// useLockedPeriods
export { useLockedPeriods, type LockedPeriod } from "../useLockedPeriods";
