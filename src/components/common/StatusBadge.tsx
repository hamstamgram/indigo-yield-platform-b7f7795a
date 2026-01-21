/**
 * StatusBadge - Standardized status indicator component
 * 
 * Provides consistent status display across the application
 * with predefined color schemes for common status values.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

// Define valid status values as a const array for type safety
const STATUS_VALUES = [
  "success", "pending", "error", "failed", "cancelled",
  "approved", "rejected", "active", "inactive", "archived",
  "processing", "queued", "scheduled", "high", "medium", "low",
  "info", "default"
] as const;

type StatusValue = typeof STATUS_VALUES[number];

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1 font-medium",
  {
    variants: {
      status: {
        // Transaction/Operation statuses
        success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        error: "bg-destructive/10 text-destructive",
        failed: "bg-destructive/10 text-destructive",
        cancelled: "bg-muted text-muted-foreground",
        
        // Approval statuses
        approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        rejected: "bg-destructive/10 text-destructive",
        
        // Entity statuses
        active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        inactive: "bg-muted text-muted-foreground",
        archived: "bg-muted text-muted-foreground",
        
        // Processing statuses
        processing: "bg-primary/10 text-primary",
        queued: "bg-accent text-accent-foreground",
        scheduled: "bg-primary/10 text-primary",
        
        // Priority statuses
        high: "bg-destructive/10 text-destructive",
        medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        low: "bg-muted text-muted-foreground",
        
        // Default
        info: "bg-primary/10 text-primary",
        default: "bg-muted text-muted-foreground",
      },
      size: {
        sm: "text-xs px-1.5 py-0.5",
        md: "text-xs px-2 py-1",
        lg: "text-sm px-2.5 py-1",
      },
    },
    defaultVariants: {
      status: "default",
      size: "md",
    },
  }
);

export interface StatusBadgeProps {
  /** The status value to display */
  status: string;
  /** Custom label (defaults to capitalized status) */
  label?: string;
  /** Show a pulsing dot indicator */
  showDot?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

// Status to variant mapping for non-standard status strings
const STATUS_MAP: Record<string, StatusValue> = {
  // Aliases for common status values
  complete: "success",
  completed: "success",
  done: "success",
  paid: "success",
  confirmed: "success",
  
  waiting: "pending",
  "in_progress": "processing",
  "in-progress": "processing",
  running: "processing",
  
  fail: "failed",
  failure: "failed",
  void: "cancelled",
  voided: "cancelled",
  deleted: "cancelled",
  
  enabled: "active",
  disabled: "inactive",
  suspended: "inactive",
  
  urgent: "high",
  critical: "high",
  normal: "medium",
  
  // Withdrawal statuses
  withdrawn: "success",
  "pending_approval": "pending",
};

function normalizeStatus(status: string): StatusValue {
  const normalized = status.toLowerCase().trim();
  
  // Check for direct match first
  if (STATUS_VALUES.includes(normalized as StatusValue)) {
    return normalized as StatusValue;
  }
  
  // Check alias map
  if (normalized in STATUS_MAP) {
    return STATUS_MAP[normalized];
  }
  
  return "default";
}

function formatLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Dot color mapping using semantic colors where possible
const DOT_COLORS: Record<StatusValue, string> = {
  success: "bg-emerald-500",
  approved: "bg-emerald-500",
  active: "bg-emerald-500",
  pending: "bg-amber-500",
  queued: "bg-accent-foreground",
  medium: "bg-amber-500",
  error: "bg-destructive",
  failed: "bg-destructive",
  rejected: "bg-destructive",
  high: "bg-destructive",
  processing: "bg-primary",
  info: "bg-primary",
  scheduled: "bg-primary",
  default: "bg-muted-foreground",
  inactive: "bg-muted-foreground",
  cancelled: "bg-muted-foreground",
  archived: "bg-muted-foreground",
  low: "bg-muted-foreground",
};

export function StatusBadge({
  status,
  label,
  showDot = false,
  size = "md",
  className,
}: StatusBadgeProps) {
  const normalizedStatus = normalizeStatus(status);
  const displayLabel = label || formatLabel(status);
  
  return (
    <Badge
      variant="outline"
      className={cn(
        statusBadgeVariants({ status: normalizedStatus, size }),
        "border-transparent",
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            normalizedStatus === "processing" && "animate-pulse",
            DOT_COLORS[normalizedStatus]
          )}
        />
      )}
      {displayLabel}
    </Badge>
  );
}

export default StatusBadge;
