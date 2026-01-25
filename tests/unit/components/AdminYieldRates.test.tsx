import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdminYieldRates from "@/components/admin/AdminYieldRates";

describe("AdminYieldRates", () => {
  it("should render without crashing", () => {
    render(<AdminYieldRates />);
    expect(screen.getByTestId("adminyieldrates")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<AdminYieldRates className="custom-class" />);
    expect(screen.getByTestId("adminyieldrates")).toHaveClass("custom-class");
  });

  it("should handle props correctly", () => {
    const props = { testProp: "test-value" };
    render(<AdminYieldRates {...props} />);
    expect(screen.getByTestId("adminyieldrates")).toBeInTheDocument();
  });

  it("should be accessible", () => {
    const { container } = render(<AdminYieldRates />);
    expect(container.querySelector("[role]")).toBeInTheDocument();
  });
});
