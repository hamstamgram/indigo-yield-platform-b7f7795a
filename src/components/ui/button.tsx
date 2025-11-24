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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary brand action - Deep Indigo with shadow
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",

        // Success actions - Mint Teal with shadow
        success:
          "bg-success text-success-foreground hover:bg-success/90 shadow-lg shadow-success/25 hover:shadow-xl hover:shadow-success/30",

        // Warning/Risk actions - Coral with dark text
        warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20",

        // Destructive actions (keep existing)
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md shadow-destructive/20",

        // Outline variant - Slate border with hover fill
        outline:
          "border-2 border-slate-300 bg-transparent hover:bg-slate-100 hover:border-slate-400 text-slate-700",

        // Secondary actions - Slate background
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",

        // Ghost variant - Minimal style
        ghost: "hover:bg-slate-100 text-slate-700 hover:text-slate-900",

        // Link variant (keep existing)
        link: "text-indigo-primary underline-offset-4 hover:underline hover:text-indigo-dark",
      },
      size: {
        // Small - 44px minimum for mobile touch targets
        sm: "h-11 px-4 text-sm",

        // Default - 48px optimal touch target
        default: "h-12 px-6 text-base",

        // Large - 56px premium feel for primary CTAs
        lg: "h-14 px-8 text-lg",

        // Icon only - Square button with 44px minimum
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "primary",
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
