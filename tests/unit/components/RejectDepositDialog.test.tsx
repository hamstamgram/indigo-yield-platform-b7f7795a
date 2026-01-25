import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import RejectDepositDialog from "@/components/admin/deposits/RejectDepositDialog";

describe("RejectDepositDialog", () => {
  it("should render without crashing", () => {
    render(<RejectDepositDialog />);
    expect(screen.getByTestId("rejectdepositdialog")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<RejectDepositDialog className="custom-class" />);
    expect(screen.getByTestId("rejectdepositdialog")).toHaveClass("custom-class");
  });

  it("should handle props correctly", () => {
    const props = { testProp: "test-value" };
    render(<RejectDepositDialog {...props} />);
    expect(screen.getByTestId("rejectdepositdialog")).toBeInTheDocument();
  });

  it("should be accessible", () => {
    const { container } = render(<RejectDepositDialog />);
    expect(container.querySelector("[role]")).toBeInTheDocument();
  });
});
