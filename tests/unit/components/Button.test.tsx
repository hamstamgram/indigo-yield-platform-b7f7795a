/**
 * Unit tests for Button component
 * Tests variants, sizes, accessibility, and interactions
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button Component", () => {
  describe("Rendering", () => {
    it("renders with default props", () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole("button", { name: /click me/i });
      expect(button).toBeInTheDocument();
    });

    it("renders with custom className", () => {
      render(<Button className="custom-class">Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });

    it("renders as child component when asChild is true", () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );
      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/test");
    });
  });

  describe("Variants", () => {
    it("renders default variant", () => {
      render(<Button variant="default">Default</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-primary");
    });

    it("renders destructive variant", () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-destructive");
    });

    it("renders outline variant", () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("border");
    });

    it("renders secondary variant", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-secondary");
    });

    it("renders ghost variant", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("hover:bg-accent");
    });

    it("renders link variant", () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("underline-offset-4");
    });
  });

  describe("Sizes", () => {
    it("renders default size (44px)", () => {
      render(<Button size="default">Default Size</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-11");
    });

    it("renders small size (44px)", () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-11");
    });

    it("renders large size (48px)", () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-12");
    });

    it("renders icon size (44x44px)", () => {
      render(<Button size="icon" aria-label="Icon button">X</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-11", "w-11");
    });
  });

  describe("States", () => {
    it("renders disabled state", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveClass("disabled:opacity-50");
    });

    it("does not trigger onClick when disabled", async () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      const button = screen.getByRole("button");

      await userEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Interactions", () => {
    it("handles click events", async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole("button");

      await userEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("handles keyboard interactions (Enter)", async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Press Enter</Button>);
      const button = screen.getByRole("button");

      button.focus();
      await userEvent.keyboard("{Enter}");
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("handles keyboard interactions (Space)", async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Press Space</Button>);
      const button = screen.getByRole("button");

      button.focus();
      await userEvent.keyboard(" ");
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("has proper button role", () => {
      render(<Button>Accessible</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("supports aria-label", () => {
      render(<Button aria-label="Custom label">Icon</Button>);
      const button = screen.getByLabelText("Custom label");
      expect(button).toBeInTheDocument();
    });

    it("supports aria-disabled", () => {
      render(<Button aria-disabled="true">Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-disabled", "true");
    });

    it("is keyboard navigable", () => {
      render(<Button>Navigate</Button>);
      const button = screen.getByRole("button");

      button.focus();
      expect(button).toHaveFocus();
    });

    it("has visible focus indicator", () => {
      render(<Button>Focus me</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("focus-visible:outline-none");
      expect(button).toHaveClass("focus-visible:ring-2");
    });

    it("meets minimum touch target size (44x44px)", () => {
      const { container } = render(<Button>Touch Target</Button>);
      const button = container.firstChild as HTMLElement;
      const styles = window.getComputedStyle(button);

      // Default button should be 44px height (h-11 = 2.75rem = 44px)
      expect(button).toHaveClass("h-11");
    });
  });

  describe("TypeScript Props", () => {
    it("accepts standard button HTML attributes", () => {
      render(
        <Button
          type="submit"
          name="submit-button"
          value="submit"
          form="test-form"
        >
          Submit
        </Button>
      );
      const button = screen.getByRole("button");

      expect(button).toHaveAttribute("type", "submit");
      expect(button).toHaveAttribute("name", "submit-button");
      expect(button).toHaveAttribute("value", "submit");
      expect(button).toHaveAttribute("form", "test-form");
    });

    it("forwards ref correctly", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Ref Button</Button>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });
});

// Add React import for ref test
import React from "react";
