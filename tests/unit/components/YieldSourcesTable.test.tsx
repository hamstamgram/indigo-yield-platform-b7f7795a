import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import YieldSourcesTable from "@/components/admin/YieldSourcesTable";

describe("YieldSourcesTable", () => {
  it("should render without crashing", () => {
    render(<YieldSourcesTable />);
    expect(screen.getByTestId("yieldsourcestable")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<YieldSourcesTable className="custom-class" />);
    expect(screen.getByTestId("yieldsourcestable")).toHaveClass("custom-class");
  });

  it("should handle props correctly", () => {
    const props = { testProp: "test-value" };
    render(<YieldSourcesTable {...props} />);
    expect(screen.getByTestId("yieldsourcestable")).toBeInTheDocument();
  });

  it("should be accessible", () => {
    const { container } = render(<YieldSourcesTable />);
    expect(container.querySelector("[role]")).toBeInTheDocument();
  });
});
