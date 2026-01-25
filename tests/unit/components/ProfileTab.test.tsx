import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProfileTab from "@/components/account/ProfileTab";

describe("ProfileTab", () => {
  it("should render without crashing", () => {
    render(<ProfileTab />);
    expect(screen.getByTestId("profiletab")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<ProfileTab className="custom-class" />);
    expect(screen.getByTestId("profiletab")).toHaveClass("custom-class");
  });

  it("should handle props correctly", () => {
    const props = { testProp: "test-value" };
    render(<ProfileTab {...props} />);
    expect(screen.getByTestId("profiletab")).toBeInTheDocument();
  });

  it("should be accessible", () => {
    const { container } = render(<ProfileTab />);
    expect(container.querySelector("[role]")).toBeInTheDocument();
  });
});
