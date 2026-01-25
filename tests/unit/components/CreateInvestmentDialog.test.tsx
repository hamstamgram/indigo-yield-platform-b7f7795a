import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CreateInvestmentDialog from "@/components/admin/investments/CreateInvestmentDialog";

describe("CreateInvestmentDialog", () => {
  it("should render without crashing", () => {
    render(<CreateInvestmentDialog />);
    expect(screen.getByTestId("createinvestmentdialog")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<CreateInvestmentDialog className="custom-class" />);
    expect(screen.getByTestId("createinvestmentdialog")).toHaveClass("custom-class");
  });

  it("should handle props correctly", () => {
    const props = { testProp: "test-value" };
    render(<CreateInvestmentDialog {...props} />);
    expect(screen.getByTestId("createinvestmentdialog")).toBeInTheDocument();
  });

  it("should be accessible", () => {
    const { container } = render(<CreateInvestmentDialog />);
    expect(container.querySelector("[role]")).toBeInTheDocument();
  });
});
