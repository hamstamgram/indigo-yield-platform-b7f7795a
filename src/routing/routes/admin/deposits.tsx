/**
 * Admin Deposit Routes
 * Redirects to Transactions page (deposits consolidated)
 */

import { Route, Navigate } from "react-router-dom";

export function DepositRoutes() {
  return (
    <>
      {/* Redirect deposits to transactions - consolidated in P1 cleanup */}
      <Route path="/admin/deposits" element={<Navigate to="/admin/ledger" replace />} />
    </>
  );
}
