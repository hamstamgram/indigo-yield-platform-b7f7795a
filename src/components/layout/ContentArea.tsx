import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ContentAreaProps = {
  children: ReactNode;
  className?: string;
};

const ContentArea = ({ children, className }: ContentAreaProps) => {
  return (
    <main className={cn("flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-100 dark:bg-gray-900 w-full", className)}>
      {children}
    </main>
  );
};

export default ContentArea;
