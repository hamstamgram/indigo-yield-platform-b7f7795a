import React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const spinnerVariants = cva(
  "relative rounded-full border-4 border-gray-200 border-t-transparent animate-spin",
  {
    variants: {
      size: {
        sm: "w-4 h-4 border-2",
        default: "w-8 h-8 border-4",
        lg: "w-12 h-12 border-4",
        xl: "w-16 h-16 border-4",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  className,
  size,
  message,
  ...props
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center", className)} {...props}>
      <div className={cn(spinnerVariants({ size }), "border-t-primary")} />
      {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
};

export const PageLoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <LoadingSpinner size="lg" message={message} />
    </div>
  );
};
