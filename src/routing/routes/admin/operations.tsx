/**
 * Admin Operations Routes
 * Day-to-day operational routes: requests, statements, support, documents
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { AdminRoute } from "../../AdminRoute";

const AdminRequestsQueuePage = lazy(() => import("@/routes/admin/AdminRequestsQueuePage"));
const AdminStatementsPage = lazy(() => import("@/routes/admin/AdminStatementsPage"));
const MonthlyDataEntry = lazy(() => import("@/routes/admin/MonthlyDataEntry"));
const DailyRatesManagement = lazy(() => import("@/routes/admin/DailyRatesManagement"));
const InvestorReports = lazy(() => import("@/routes/admin/InvestorReports"));
const AdminTransactions = lazy(() => import("@/routes/admin/AdminTransactions"));
const AdminOperationsHub = lazy(() => import("@/routes/admin/AdminOperationsHub"));

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

      {/* Redirects for removed fund management */}
      <Route path="/admin/funds" element={<Navigate to="/admin/monthly-data-entry" replace />} />
      <Route path="/admin/yield-settings" element={<Navigate to="/admin/monthly-data-entry" replace />} />

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
