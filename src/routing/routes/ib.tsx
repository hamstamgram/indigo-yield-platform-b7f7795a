/**
 * IB Routes Module
 * Routes for Introducing Brokers
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { IBRoute } from "../IBRoute";

const IBOverviewPage = lazy(() => import("@/routes/ib/IBOverviewPage"));
const IBReferralsPage = lazy(() => import("@/routes/ib/IBReferralsPage"));
const IBReferralDetailPage = lazy(() => import("@/routes/ib/IBReferralDetailPage"));
const IBCommissionsPage = lazy(() => import("@/routes/ib/IBCommissionsPage"));
const IBPayoutHistoryPage = lazy(() => import("@/routes/ib/IBPayoutHistoryPage"));
const IBSettingsPage = lazy(() => import("@/routes/ib/IBSettingsPage"));

export function IBUserRoutes() {
  return (
    <>
      <Route path="/ib" element={<IBRoute><IBOverviewPage /></IBRoute>} />
      <Route path="/ib/referrals" element={<IBRoute><IBReferralsPage /></IBRoute>} />
      <Route path="/ib/referrals/:id" element={<IBRoute><IBReferralDetailPage /></IBRoute>} />
      <Route path="/ib/commissions" element={<IBRoute><IBCommissionsPage /></IBRoute>} />
      <Route path="/ib/payouts" element={<IBRoute><IBPayoutHistoryPage /></IBRoute>} />
      <Route path="/ib/settings" element={<IBRoute><IBSettingsPage /></IBRoute>} />
      {/* Legacy redirect */}
      <Route path="/ib/dashboard" element={<Navigate to="/ib" replace />} />
    </>
  );
}
