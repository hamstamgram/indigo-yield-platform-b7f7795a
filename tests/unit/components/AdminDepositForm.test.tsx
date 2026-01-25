import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdminDepositForm from "@/components/admin/deposits/AdminDepositForm";

describe("AdminDepositForm", () => {
  it("should render without crashing", () => {
    render(<AdminDepositForm />);
    expect(screen.getByTestId("admindepositform")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<AdminDepositForm className="custom-class" />);
    expect(screen.getByTestId("admindepositform")).toHaveClass("custom-class");
  });

  it("should handle props correctly", () => {
    const props = { testProp: "test-value" };
    render(<AdminDepositForm {...props} />);
    expect(screen.getByTestId("admindepositform")).toBeInTheDocument();
  });

  it("should be accessible", () => {
    const { container } = render(<AdminDepositForm />);
    expect(container.querySelector("[role]")).toBeInTheDocument();
  });
});
