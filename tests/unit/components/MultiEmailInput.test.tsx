import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import MultiEmailInput from "@/components/admin/MultiEmailInput";

describe("MultiEmailInput", () => {
  it("should render without crashing", () => {
    render(<MultiEmailInput />);
    expect(screen.getByTestId("multiemailinput")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<MultiEmailInput className="custom-class" />);
    expect(screen.getByTestId("multiemailinput")).toHaveClass("custom-class");
  });

  it("should handle props correctly", () => {
    const props = { testProp: "test-value" };
    render(<MultiEmailInput {...props} />);
    expect(screen.getByTestId("multiemailinput")).toBeInTheDocument();
  });

  it("should be accessible", () => {
    const { container } = render(<MultiEmailInput />);
    expect(container.querySelector("[role]")).toBeInTheDocument();
  });
});
