/**
 * Admin Operations Routes
 * Day-to-day operational routes: requests, statements, support, documents
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminRequestsQueuePage = lazy(() => import("@/pages/admin/AdminRequestsQueuePage"));
const AdminStatementsPage = lazy(() => import("@/pages/admin/AdminStatementsPage"));
const AdminSupportQueue = lazy(() => import("@/pages/admin/AdminSupportQueue"));
const AdminDocumentsPage = lazy(() => import("@/pages/admin/AdminDocumentsPage"));
const AdminWithdrawalsPage = lazy(() => import("@/pages/admin/AdminWithdrawalsPage"));
const MonthlyDataEntry = lazy(() => import("@/pages/admin/MonthlyDataEntry"));
const DailyRatesManagement = lazy(() => import("@/pages/admin/DailyRatesManagement"));
const InvestorReports = lazy(() => import("@/pages/admin/InvestorReports"));
const InvestorReportGenerator = lazy(() => import("@/pages/admin/InvestorReportGenerator"));
const AdminTransactions = lazy(() => import("@/pages/admin/AdminTransactions"));
const BalanceAdjustments = lazy(() =>
  import("@/pages/admin/BalanceAdjustments").then((m) => ({ default: m.BalanceAdjustments }))
);
const AdminOperationsHub = lazy(() => import("@/pages/admin/AdminOperationsHub"));
const FundManagement = lazy(() => import("@/pages/admin/funds/FundManagement"));
const TestYieldPage = lazy(() => import("@/pages/admin/TestYieldPage"));

export function OperationsRoutes() {
  return (
    <>
      {/* Transaction management */}
      <Route
        path="/admin/transactions-all"
        element={
          <AdminRoute>
            <AdminTransactions />
          </AdminRoute>
        }
      />

      {/* Monthly data & rates */}
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
      <Route
        path="/admin/report-generator"
        element={
          <AdminRoute>
            <InvestorReportGenerator />
          </AdminRoute>
        }
      />

      {/* Request & document management */}
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
        path="/admin/withdrawals"
        element={
          <AdminRoute>
            <AdminWithdrawalsPage />
          </AdminRoute>
        }
      />

      {/* Balance adjustments */}
      <Route
        path="/admin/balances/adjust"
        element={
          <AdminRoute>
            <BalanceAdjustments />
          </AdminRoute>
        }
      />

      {/* Fund management */}
      <Route
        path="/admin/funds"
        element={
          <AdminRoute>
            <FundManagement />
          </AdminRoute>
        }
      />
      <Route path="/admin/yield-settings" element={<Navigate to="/admin/funds" replace />} />

      {/* Operations page */}
      <Route
        path="/admin/operations"
        element={
          <AdminRoute>
            <AdminOperationsHub />
          </AdminRoute>
        }
      />
      <Route path="/admin-operations" element={<Navigate to="/admin/operations" replace />} />

      {/* Test utilities */}
      <Route
        path="/admin/test-yield"
        element={
          <AdminRoute>
            <TestYieldPage />
          </AdminRoute>
        }
      />
    </>
  );
}
