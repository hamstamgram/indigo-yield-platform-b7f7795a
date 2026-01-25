import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import AssetOverview from "@/components/admin/AssetOverview";

describe("AssetOverview", () => {
  it("should render without crashing", () => {
    render(<AssetOverview />);
    expect(screen.getByTestId("assetoverview")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<AssetOverview className="custom-class" />);
    expect(screen.getByTestId("assetoverview")).toHaveClass("custom-class");
  });

  it("should handle props correctly", () => {
    const props = { testProp: "test-value" };
    render(<AssetOverview {...props} />);
    expect(screen.getByTestId("assetoverview")).toBeInTheDocument();
  });

  it("should be accessible", () => {
    const { container } = render(<AssetOverview />);
    expect(container.querySelector("[role]")).toBeInTheDocument();
  });
});
