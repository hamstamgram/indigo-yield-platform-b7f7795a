import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdminGuard from "@/components/admin/AdminGuard";

describe("AdminGuard", () => {
  it("should render without crashing", () => {
    render(<AdminGuard />);
    expect(screen.getByTestId("adminguard")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<AdminGuard className="custom-class" />);
    expect(screen.getByTestId("adminguard")).toHaveClass("custom-class");
  });

  it("should handle props correctly", () => {
    const props = { testProp: "test-value" };
    render(<AdminGuard {...props} />);
    expect(screen.getByTestId("adminguard")).toBeInTheDocument();
  });

  it("should be accessible", () => {
    const { container } = render(<AdminGuard />);
    expect(container.querySelector("[role]")).toBeInTheDocument();
  });
});
