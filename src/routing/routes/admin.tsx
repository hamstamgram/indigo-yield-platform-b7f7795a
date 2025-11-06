/**
 * Admin Routes Module
 * All admin-protected routes for platform management
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../AdminRoute";

// Admin pages - lazy load all
const AdminTools = lazy(() => import("@/pages/admin/settings/AdminTools"));
const AdminInvite = lazy(() => import("@/pages/admin/settings/AdminInvite"));
const AdminDashboardV2 = lazy(() => import("@/components/admin/AdminDashboardV2"));
const PortfolioDashboard = lazy(() => import("@/pages/admin/PortfolioDashboard"));
const InvestorManagementView = lazy(() => import("@/components/admin/InvestorManagementView"));
const InvestorDetail = lazy(() => import("@/pages/admin/InvestorDetail"));
const AdminOperations = lazy(() => import("@/pages/admin/settings/AdminOperations"));
const AdminAudit = lazy(() => import("@/pages/admin/settings/AdminAudit"));

// New Admin Module Pages
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminInvestorManagement = lazy(() => import("@/pages/admin/AdminInvestorManagement"));
const AdminInvestorDetailNew = lazy(() => import("@/pages/admin/AdminInvestorDetail"));
const AdminTransactions = lazy(() => import("@/pages/admin/AdminTransactions"));
const AdminWithdrawalsNew = lazy(() => import("@/pages/admin/AdminWithdrawals"));
const AdminDocumentsNew = lazy(() => import("@/pages/admin/AdminDocuments"));
const AdminCompliance = lazy(() => import("@/pages/admin/AdminCompliance"));
const AdminReportsNew = lazy(() => import("@/pages/admin/AdminReports"));
const AdminSettingsNew = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminAuditLogs = lazy(() => import("@/pages/admin/AdminAuditLogs"));
const AdminUserManagement = lazy(() => import("@/pages/admin/AdminUserManagement"));

// Admin Investor Management Pages
const AdminInvestorNewPage = lazy(() => import("@/pages/admin/investors/AdminInvestorNewPage"));
const AdminInvestorDetailPage = lazy(
  () => import("@/pages/admin/investors/AdminInvestorDetailPage")
);
const AdminInvestorPositionsPage = lazy(
  () => import("@/pages/admin/investors/AdminInvestorPositionsPage")
);
const AdminInvestorTransactionsPage = lazy(
  () => import("@/pages/admin/investors/AdminInvestorTransactionsPage")
);

// Phase 5: Monthly Data Entry & Daily Rates
const MonthlyDataEntry = lazy(() => import("@/pages/admin/MonthlyDataEntry"));
const DailyRatesManagement = lazy(() => import("@/pages/admin/DailyRatesManagement"));
const InvestorReports = lazy(() => import("@/pages/admin/InvestorReports"));

// Admin Operations Pages
const AdminRequestsQueuePage = lazy(() => import("@/pages/admin/AdminRequestsQueuePage"));
const AdminStatementsPage = lazy(() => import("@/pages/admin/AdminStatementsPage"));
const AdminSupportQueue = lazy(() => import("@/pages/admin/AdminSupportQueue"));
const AdminReports = lazy(() => import("@/pages/admin/AdminReports"));
const AdminDocumentsPage = lazy(() => import("@/pages/admin/AdminDocumentsPage"));
const HistoricalReportsDashboard = lazy(
  () => import("@/components/admin/investors/HistoricalReportsDashboard")
);
const AdminBatchReportsPage = lazy(() => import("@/pages/admin/AdminBatchReportsPage"));
const AdminWithdrawalsPage = lazy(() => import("@/pages/admin/AdminWithdrawalsPage"));

// Expert Investor Management
const ExpertInvestorMasterView = lazy(() => import("@/pages/admin/ExpertInvestorMasterView"));
const ExpertInvestorDashboard = lazy(
  () => import("@/components/admin/expert/ExpertInvestorDashboard")
);

// Admin Complex Components
const InvestorAccountCreation = lazy(() =>
  import("@/pages/admin/InvestorAccountCreation").then((m) => ({
    default: m.InvestorAccountCreation,
  }))
);
const BalanceAdjustments = lazy(() =>
  import("@/pages/admin/BalanceAdjustments").then((m) => ({ default: m.BalanceAdjustments }))
);
const InvestorStatusTracking = lazy(() =>
  import("@/pages/admin/InvestorStatusTracking").then((m) => ({
    default: m.InvestorStatusTracking,
  }))
);
const FundManagement = lazy(() => import("@/pages/admin/funds/FundManagement"));
const AuditDrilldown = lazy(() => import("@/pages/admin/AuditDrilldown"));

// Admin Utilities
const PDFGenerationDemo = lazy(() =>
  import("@/components/pdf/PDFGenerationDemo").then((m) => ({ default: m.PDFGenerationDemo }))
);
const TestYieldPage = lazy(() => import("@/pages/admin/TestYieldPage"));

/**
 * Admin Routes Component
 * Exports all admin-protected routes
 */
export function AdminRoutes() {
  return (
    <>
      {/* Main Admin Dashboard */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/portfolio"
        element={
          <AdminRoute>
            <PortfolioDashboard />
          </AdminRoute>
        }
      />
      <Route path="/admin/yield-settings" element={<Navigate to="/admin/funds" replace />} />

      {/* New Admin Module Routes */}
      <Route
        path="/admin/investors-management"
        element={
          <AdminRoute>
            <AdminInvestorManagement />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/investor/:id"
        element={
          <AdminRoute>
            <AdminInvestorDetailNew />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/transactions-all"
        element={
          <AdminRoute>
            <AdminTransactions />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/withdrawals-queue"
        element={
          <AdminRoute>
            <AdminWithdrawalsNew />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/documents-queue"
        element={
          <AdminRoute>
            <AdminDocumentsNew />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/compliance"
        element={
          <AdminRoute>
            <AdminCompliance />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/reports-admin"
        element={
          <AdminRoute>
            <AdminReportsNew />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/settings-platform"
        element={
          <AdminRoute>
            <AdminSettingsNew />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <AdminRoute>
            <AdminAuditLogs />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUserManagement />
          </AdminRoute>
        }
      />

      {/* Phase 5: Monthly Data Entry & Daily Rates */}
      <Route
        path="/admin/monthly-data-entry"
        element={
          <AdminRoute>
            <MonthlyDataEntry />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/daily-rates"
        element={
          <AdminRoute>
            <DailyRatesManagement />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/investor-reports"
        element={
          <AdminRoute>
            <InvestorReports />
          </AdminRoute>
        }
      />

      {/* Existing Admin Routes */}
      <Route
        path="/admin/investors"
        element={
          <AdminRoute>
            <InvestorManagementView />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/investors/new"
        element={
          <AdminRoute>
            <AdminInvestorNewPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/investors/:id"
        element={
          <AdminRoute>
            <AdminInvestorDetailPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/investors/:id/positions"
        element={
          <AdminRoute>
            <AdminInvestorPositionsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/investors/:id/transactions"
        element={
          <AdminRoute>
            <AdminInvestorTransactionsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/expert-investors"
        element={
          <AdminRoute>
            <ExpertInvestorMasterView />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/expert-investor/:id"
        element={
          <AdminRoute>
            <ExpertInvestorDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/requests"
        element={
          <AdminRoute>
            <AdminRequestsQueuePage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/statements"
        element={
          <AdminRoute>
            <AdminStatementsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/support"
        element={
          <AdminRoute>
            <AdminSupportQueue />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/documents"
        element={
          <AdminRoute>
            <AdminDocumentsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <AdminRoute>
            <AdminReports />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/reports/historical"
        element={
          <AdminRoute>
            <HistoricalReportsDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/withdrawals"
        element={
          <AdminRoute>
            <AdminWithdrawalsPage />
          </AdminRoute>
        }
      />

      {/* Phase 3.1 Admin Features */}
      <Route
        path="/admin/investors/create"
        element={
          <AdminRoute>
            <InvestorAccountCreation />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/balances/adjust"
        element={
          <AdminRoute>
            <BalanceAdjustments />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/investors/status"
        element={
          <AdminRoute>
            <InvestorStatusTracking />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/funds"
        element={
          <AdminRoute>
            <FundManagement />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/audit-drilldown"
        element={
          <AdminRoute>
            <AuditDrilldown />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/test-yield"
        element={
          <AdminRoute>
            <TestYieldPage />
          </AdminRoute>
        }
      />

      {/* Phase 3.2 Admin Features */}
      <Route
        path="/admin/pdf-demo"
        element={
          <AdminRoute>
            <PDFGenerationDemo />
          </AdminRoute>
        }
      />

      {/* Legacy admin routes - redirects to new structure */}
      <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
      <Route path="/admin-investors" element={<Navigate to="/admin/investors" replace />} />

      {/* Keep existing admin tools routes for now */}
      <Route
        path="/admin-tools"
        element={
          <AdminRoute>
            <AdminTools />
          </AdminRoute>
        }
      />
      <Route
        path="/admin-operations"
        element={
          <AdminRoute>
            <AdminOperations />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <AdminRoute>
            <AdminAudit />
          </AdminRoute>
        }
      />
    </>
  );
}
