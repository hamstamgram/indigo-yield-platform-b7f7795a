/**
 * Documents Routes
 * Document vault, uploads, and viewing
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

// Documents pages
const DocumentsHubPage = lazy(() => import("@/routes/documents/DocumentsHubPage"));
const DocumentViewerPage = lazy(() => import("@/routes/documents/DocumentViewerPage"));

export function DocumentRoutes() {
  return (
    <>
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <DocumentsHubPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/upload"
        element={
          <ProtectedRoute>
            <DocumentsHubPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/statements"
        element={
          <ProtectedRoute>
            <DocumentsHubPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/statements/:id"
        element={
          <ProtectedRoute>
            <DocumentViewerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/trade-confirmations"
        element={
          <ProtectedRoute>
            <DocumentsHubPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/agreements"
        element={
          <ProtectedRoute>
            <DocumentsHubPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/categories"
        element={
          <ProtectedRoute>
            <DocumentsHubPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/:id"
        element={
          <ProtectedRoute>
            <DocumentViewerPage />
          </ProtectedRoute>
        }
      />
    </>
  );
}
