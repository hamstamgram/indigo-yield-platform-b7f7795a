import * as React from "react";
import { cn } from "@/lib/utils";

type GlassVariant = "panel" | "card" | "dialog";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
}

const variantClasses: Record<GlassVariant, string> = {
  panel: "glass-panel rounded-2xl p-6",
  card: "glass-card rounded-xl p-4",
  dialog: "glass-dialog rounded-2xl p-6",
};

const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, variant = "panel", ...props }, ref) => (
    <div ref={ref} className={cn(variantClasses[variant], className)} {...props} />
  )
);
GlassPanel.displayName = "GlassPanel";

export { GlassPanel };
export type { GlassPanelProps, GlassVariant };
