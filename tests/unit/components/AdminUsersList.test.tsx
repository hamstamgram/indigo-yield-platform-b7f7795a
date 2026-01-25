import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdminUsersList from "@/components/admin/AdminUsersList";

describe("AdminUsersList", () => {
  it("should render without crashing", () => {
    render(<AdminUsersList />);
    expect(screen.getByTestId("adminuserslist")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<AdminUsersList className="custom-class" />);
    expect(screen.getByTestId("adminuserslist")).toHaveClass("custom-class");
  });

  it("should handle props correctly", () => {
    const props = { testProp: "test-value" };
    render(<AdminUsersList {...props} />);
    expect(screen.getByTestId("adminuserslist")).toBeInTheDocument();
  });

  it("should be accessible", () => {
    const { container } = render(<AdminUsersList />);
    expect(container.querySelector("[role]")).toBeInTheDocument();
  });
});
