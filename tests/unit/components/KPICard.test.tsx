/**
 * Unit tests for KPICard component
 * Tests rendering, trends, and accessibility
 */

import { render, screen } from "@testing-library/react";
import { KPICard } from "@/components/dashboard/KPICard";
import { DollarSign } from "lucide-react";

describe("KPICard Component", () => {
  describe("Basic Rendering", () => {
    it("renders title and value", () => {
      render(<KPICard title="Total Revenue" value="$1,234,567" />);

      expect(screen.getByText("Total Revenue")).toBeInTheDocument();
      expect(screen.getByText("$1,234,567")).toBeInTheDocument();
    });

    it("renders subtitle when provided", () => {
      render(
        <KPICard
          title="Active Users"
          value="10,500"
          subtitle="Last 30 days"
        />
      );

      expect(screen.getByText("Last 30 days")).toBeInTheDocument();
    });

    it("renders custom icon", () => {
      const { container } = render(
        <KPICard
          title="Revenue"
          value="$1M"
          icon={<DollarSign data-testid="dollar-icon" />}
        />
      );

      expect(screen.getByTestId("dollar-icon")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <KPICard
          title="Test"
          value="100"
          className="custom-class"
        />
      );

      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });

  describe("Trend Indicators", () => {
    it("displays positive trend", () => {
      render(
        <KPICard
          title="Growth"
          value="100"
          percentage={12.5}
          trend="up"
        />
      );

      expect(screen.getByText("+12.50%")).toBeInTheDocument();
    });

    it("displays negative trend", () => {
      render(
        <KPICard
          title="Churn"
          value="50"
          percentage={-5.25}
          trend="down"
        />
      );

      expect(screen.getByText("-5.25%")).toBeInTheDocument();
    });

    it("displays neutral trend", () => {
      render(
        <KPICard
          title="Stable"
          value="100"
          percentage={0}
          trend="neutral"
        />
      );

      expect(screen.getByText("+0.00%")).toBeInTheDocument();
    });

    it("does not display trend when percentage is undefined", () => {
      const { container } = render(
        <KPICard
          title="No Trend"
          value="100"
        />
      );

      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    it("uses correct color for up trend", () => {
      const { container } = render(
        <KPICard
          title="Growth"
          value="100"
          percentage={10}
          trend="up"
        />
      );

      const trendElement = screen.getByText("+10.00%").parentElement;
      expect(trendElement).toHaveClass("text-green-600");
    });

    it("uses correct color for down trend", () => {
      const { container } = render(
        <KPICard
          title="Decline"
          value="100"
          percentage={-10}
          trend="down"
        />
      );

      const trendElement = screen.getByText("-10.00%").parentElement;
      expect(trendElement).toHaveClass("text-red-600");
    });
  });

  describe("Accessibility", () => {
    it("has proper testid", () => {
      render(<KPICard title="Test" value="100" />);
      expect(screen.getByTestId("kpi-card")).toBeInTheDocument();
    });

    it("renders as a card with proper structure", () => {
      const { container } = render(
        <KPICard title="Test Card" value="500" />
      );

      // Should have card structure
      const card = screen.getByTestId("kpi-card");
      expect(card).toBeInTheDocument();
    });

    it("has accessible title text", () => {
      render(<KPICard title="User Count" value="1,000" />);

      const title = screen.getByText("User Count");
      expect(title).toHaveClass("text-muted-foreground");
    });

    it("has clear value display", () => {
      render(<KPICard title="Revenue" value="$50,000" />);

      const value = screen.getByText("$50,000");
      expect(value).toHaveClass("text-2xl", "font-bold");
    });
  });

  describe("Hover Effects", () => {
    it("has hover shadow transition", () => {
      const { container } = render(
        <KPICard title="Hoverable" value="100" />
      );

      const card = screen.getByTestId("kpi-card");
      expect(card).toHaveClass("hover:shadow-lg");
      expect(card).toHaveClass("transition-all");
    });
  });

  describe("Responsive Design", () => {
    it("uses responsive text sizing", () => {
      render(<KPICard title="Responsive" value="1,000" />);

      const value = screen.getByText("1,000");
      expect(value).toHaveClass("text-2xl"); // Should be responsive
    });

    it("subtitle uses appropriate sizing", () => {
      render(
        <KPICard
          title="Test"
          value="100"
          subtitle="Small text"
        />
      );

      const subtitle = screen.getByText("Small text");
      expect(subtitle).toHaveClass("text-xs");
    });
  });

  describe("Edge Cases", () => {
    it("handles very large numbers", () => {
      render(<KPICard title="Big Number" value="999,999,999,999" />);
      expect(screen.getByText("999,999,999,999")).toBeInTheDocument();
    });

    it("handles zero value", () => {
      render(<KPICard title="Zero" value="0" />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("handles negative percentage correctly", () => {
      render(
        <KPICard
          title="Negative"
          value="100"
          percentage={-99.99}
          trend="down"
        />
      );

      expect(screen.getByText("-99.99%")).toBeInTheDocument();
    });

    it("handles positive percentage correctly", () => {
      render(
        <KPICard
          title="Positive"
          value="100"
          percentage={99.99}
          trend="up"
        />
      );

      expect(screen.getByText("+99.99%")).toBeInTheDocument();
    });

    it("formats percentage to 2 decimal places", () => {
      render(
        <KPICard
          title="Precise"
          value="100"
          percentage={12.345678}
          trend="up"
        />
      );

      expect(screen.getByText("+12.35%")).toBeInTheDocument();
    });
  });

  describe("TypeScript Props", () => {
    it("accepts string value", () => {
      render(<KPICard title="String" value="Test Value" />);
      expect(screen.getByText("Test Value")).toBeInTheDocument();
    });

    it("accepts number value", () => {
      render(<KPICard title="Number" value={12345} />);
      expect(screen.getByText("12345")).toBeInTheDocument();
    });
  });
});
