import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import AppLogo from "@/components/AppLogo";

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe("AppLogo", () => {
  it("should render without crashing", () => {
    renderWithRouter(<AppLogo />);
    expect(screen.getByAltText("Indigo Digital Assets Yield")).toBeInTheDocument();
  });

  it("should apply custom className to image", () => {
    renderWithRouter(<AppLogo className="custom-class" />);
    expect(screen.getByAltText("Indigo Digital Assets Yield")).toHaveClass("custom-class");
  });

  it("should render as link when linkTo is provided", () => {
    renderWithRouter(<AppLogo linkTo="/dashboard" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("should render without link when linkTo is not provided", () => {
    renderWithRouter(<AppLogo />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("should have lazy loading for performance", () => {
    renderWithRouter(<AppLogo />);
    const img = screen.getByAltText("Indigo Digital Assets Yield");
    expect(img).toHaveAttribute("loading", "lazy");
  });
});
