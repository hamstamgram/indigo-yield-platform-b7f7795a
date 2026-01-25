import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ExpertInvestorDashboard from "@/components/admin/expert/ExpertInvestorDashboard";

describe("ExpertInvestorDashboard", () => {
  it("should render without crashing", () => {
    render(<ExpertInvestorDashboard />);
    expect(screen.getByTestId("expertinvestordashboard")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<ExpertInvestorDashboard className="custom-class" />);
    expect(screen.getByTestId("expertinvestordashboard")).toHaveClass("custom-class");
  });

  it("should handle props correctly", () => {
    const props = { testProp: "test-value" };
    render(<ExpertInvestorDashboard {...props} />);
    expect(screen.getByTestId("expertinvestordashboard")).toBeInTheDocument();
  });

  it("should be accessible", () => {
    const { container } = render(<ExpertInvestorDashboard />);
    expect(container.querySelector("[role]")).toBeInTheDocument();
  });
});
