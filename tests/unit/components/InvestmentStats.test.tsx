import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import InvestmentStats from "@/components/admin/investments/InvestmentStats";

describe("InvestmentStats", () => {
  it("should render without crashing", () => {
    render(<InvestmentStats />);
    expect(screen.getByTestId("investmentstats")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<InvestmentStats className="custom-class" />);
    expect(screen.getByTestId("investmentstats")).toHaveClass("custom-class");
  });

  it("should handle props correctly", () => {
    const props = { testProp: "test-value" };
    render(<InvestmentStats {...props} />);
    expect(screen.getByTestId("investmentstats")).toBeInTheDocument();
  });

  it("should be accessible", () => {
    const { container } = render(<InvestmentStats />);
    expect(container.querySelector("[role]")).toBeInTheDocument();
  });
});
