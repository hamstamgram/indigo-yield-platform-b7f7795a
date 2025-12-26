/**
 * IB Routes Module
 * Routes for Introducing Brokers
 */

import { Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import { IBRoute } from "../IBRoute";

const IBOverviewPage = lazy(() => import("@/pages/ib/IBOverviewPage"));
const IBReferralsPage = lazy(() => import("@/pages/ib/IBReferralsPage"));
const IBReferralDetailPage = lazy(() => import("@/pages/ib/IBReferralDetailPage"));
const IBCommissionsPage = lazy(() => import("@/pages/ib/IBCommissionsPage"));
const IBPayoutHistoryPage = lazy(() => import("@/pages/ib/IBPayoutHistoryPage"));
const IBSettingsPage = lazy(() => import("@/pages/ib/IBSettingsPage"));

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
