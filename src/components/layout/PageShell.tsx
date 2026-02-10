import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  maxWidth?: "narrow" | "default" | "wide";
  className?: string;
}

const WIDTH_CLASSES = {
  narrow: "max-w-5xl",
  default: "max-w-[1400px]",
  wide: "max-w-[1600px]",
} as const;

export function PageShell({ children, maxWidth = "default", className }: PageShellProps) {
  return (
    <div
      className={cn(WIDTH_CLASSES[maxWidth], "mx-auto space-y-6 pb-10 animate-fade-in", className)}
    >
      {children}
    </div>
  );
}

export default PageShell;
