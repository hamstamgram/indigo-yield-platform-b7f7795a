import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ContentAreaProps = {
  children: ReactNode;
  className?: string;
};

const ContentArea = ({ children, className }: ContentAreaProps) => {
  return (
    <div className={cn("flex-1 overflow-y-auto bg-muted/30", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
    </div>
  );
};

export default ContentArea;
