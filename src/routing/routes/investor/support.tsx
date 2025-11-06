/**
 * Support Routes
 * Help desk, tickets, live chat, and knowledge base
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

// Support pages
const SupportHubPage = lazy(() => import("@/pages/support/SupportHubPage"));
const SupportTickets = lazy(() => import("@/pages/support/SupportTicketsPage"));
const NewTicketPage = lazy(() => import("@/pages/support/NewTicketPage"));
const TicketDetailPage = lazy(() => import("@/pages/support/TicketDetailPage"));
const LiveChatPage = lazy(() => import("@/pages/support/LiveChatPage"));

export function SupportRoutes() {
  return (
    <>
      <Route
        path="/support"
        element={
          <ProtectedRoute>
            <SupportHubPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support/tickets"
        element={
          <ProtectedRoute>
            <SupportTickets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support/tickets/new"
        element={
          <ProtectedRoute>
            <NewTicketPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support/tickets/:id"
        element={
          <ProtectedRoute>
            <TicketDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support/live-chat"
        element={
          <ProtectedRoute>
            <LiveChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support/faq"
        element={
          <ProtectedRoute>
            <SupportHubPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support/knowledge-base"
        element={
          <ProtectedRoute>
            <SupportHubPage />
          </ProtectedRoute>
        }
      />
    </>
  );
}
