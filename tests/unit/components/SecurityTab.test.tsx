import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import SecurityTab from "@/components/account/SecurityTab";

describe("SecurityTab", () => {
  it("should render without crashing", () => {
    render(<SecurityTab />);
    expect(screen.getByTestId("securitytab")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<SecurityTab className="custom-class" />);
    expect(screen.getByTestId("securitytab")).toHaveClass("custom-class");
  });

  it("should handle props correctly", () => {
    const props = { testProp: "test-value" };
    render(<SecurityTab {...props} />);
    expect(screen.getByTestId("securitytab")).toBeInTheDocument();
  });

  it("should be accessible", () => {
    const { container } = render(<SecurityTab />);
    expect(container.querySelector("[role]")).toBeInTheDocument();
  });
});
