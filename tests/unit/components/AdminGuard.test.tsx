import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { AdminGuard } from "@/features/admin/shared/AdminGuard";

// Mock the auth service
vi.mock("@/services/auth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/services/auth";
const mockUseAuth = vi.mocked(useAuth);

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe("AdminGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state when loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      isAdmin: false,
    } as any);

    renderWithRouter(
      <AdminGuard>
        <div>Protected Content</div>
      </AdminGuard>
    );

    expect(screen.getByText("Verifying access...")).toBeInTheDocument();
  });

  it("should render children when user is admin", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "123", email: "admin@test.com" },
      loading: false,
      isAdmin: true,
    } as any);

    renderWithRouter(
      <AdminGuard>
        <div>Protected Content</div>
      </AdminGuard>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("should show access denied when user is not admin", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "123", email: "user@test.com" },
      loading: false,
      isAdmin: false,
    } as any);

    renderWithRouter(
      <AdminGuard>
        <div>Protected Content</div>
      </AdminGuard>
    );

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("should redirect to login when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAdmin: false,
    } as any);

    renderWithRouter(
      <AdminGuard>
        <div>Protected Content</div>
      </AdminGuard>
    );

    // Navigate component redirects, content should not be visible
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});
