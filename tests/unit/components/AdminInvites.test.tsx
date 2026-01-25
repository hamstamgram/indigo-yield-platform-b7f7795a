import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdminInvites from "@/components/admin/AdminInvites";

describe("AdminInvites", () => {
  it("should render without crashing", () => {
    render(<AdminInvites />);
    expect(screen.getByTestId("admininvites")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<AdminInvites className="custom-class" />);
    expect(screen.getByTestId("admininvites")).toHaveClass("custom-class");
  });

  it("should handle props correctly", () => {
    const props = { testProp: "test-value" };
    render(<AdminInvites {...props} />);
    expect(screen.getByTestId("admininvites")).toBeInTheDocument();
  });

  it("should be accessible", () => {
    const { container } = render(<AdminInvites />);
    expect(container.querySelector("[role]")).toBeInTheDocument();
  });
});
