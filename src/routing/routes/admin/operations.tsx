/**
 * Admin Operations Routes
 * Day-to-day operational routes: requests, statements, support, documents
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminRequestsQueuePage = lazy(() => import("@/routes/admin/AdminRequestsQueuePage"));
const AdminStatementsPage = lazy(() => import("@/routes/admin/AdminStatementsPage"));
const AdminDocumentsPage = lazy(() => import("@/routes/admin/AdminDocumentsPage"));
const AdminWithdrawalsPage = lazy(() => import("@/routes/admin/AdminWithdrawalsPage"));
const MonthlyDataEntry = lazy(() => import("@/routes/admin/MonthlyDataEntry"));
const DailyRatesManagement = lazy(() => import("@/routes/admin/DailyRatesManagement"));
const InvestorReports = lazy(() => import("@/routes/admin/InvestorReports"));
const AdminTransactions = lazy(() => import("@/routes/admin/AdminTransactions"));
const AdminOperationsHub = lazy(() => import("@/routes/admin/AdminOperationsHub"));
const FundManagement = lazy(() => import("@/routes/admin/funds/FundManagement"));

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
    </>
  );
}
