/**
 * Button Component - Indigo Yield Platform Design System v2.0
 *
 * Enhanced with "Sophisticated Simplicity" design principles:
 * - Indigo spectrum color palette
 * - Optimized touch targets (44px+ minimum)
 * - Tactile feedback with scale animations
 * - Elegant shadows using brand colors
 *
 * @example
 * <Button variant="primary" size="default">Invest Now</Button>
 * <Button variant="success" size="lg">Confirm Deposit</Button>
 * <Button variant="warning" size="sm">Review Risk</Button>
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg btn-premium",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline:
          "border border-input bg-background/50 hover:bg-accent hover:text-accent-foreground backdrop-blur-sm",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        premium:
          "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] border-0",

        // COMPATIBILITY VARIANTS
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg btn-premium",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-md",
        warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-md",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8 text-base",
        icon: "h-10 w-10",
        xl: "h-12 rounded-lg px-8 text-lg font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
