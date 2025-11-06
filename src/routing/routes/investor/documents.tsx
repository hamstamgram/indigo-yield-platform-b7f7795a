/**
 * Documents Routes
 * Document vault, uploads, and viewing
 */

import { Route } from "react-router-dom";
import { lazy } from "react";
import { ProtectedRoute } from "../../ProtectedRoute";

// Documents pages
const DocumentsVaultPage = lazy(() => import("@/pages/documents/DocumentsVaultPage"));
const DocumentViewerPage = lazy(() => import("@/pages/documents/DocumentViewerPage"));
const DocumentUploadPage = lazy(() => import("@/pages/documents/DocumentUploadPage"));

export function DocumentRoutes() {
  return (
    <>
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <DocumentsVaultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/upload"
        element={
          <ProtectedRoute>
            <DocumentUploadPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/statements"
        element={
          <ProtectedRoute>
            <DocumentsVaultPage />
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
            <DocumentsVaultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/agreements"
        element={
          <ProtectedRoute>
            <DocumentsVaultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/categories"
        element={
          <ProtectedRoute>
            <DocumentsVaultPage />
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
