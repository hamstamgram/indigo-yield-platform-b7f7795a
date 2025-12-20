/**
 * InvestorKpiChips - Reusable KPI chips for investor header
 * Shows: Total AUM, Active funds, Pending withdrawals, Last report, IB linked, Fee schedule
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DollarSign, Briefcase, Clock, FileText, Users, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvestorKpiChipsProps {
  totalAum: number;
  activeFundsCount: number;
  pendingWithdrawalsCount: number;
  lastReportPeriod: string | null;
  hasIbLinked: boolean;
  hasFeeSchedule: boolean;
  compact?: boolean;
}

export function InvestorKpiChips({
  totalAum,
  activeFundsCount,
  pendingWithdrawalsCount,
  lastReportPeriod,
  hasIbLinked,
  hasFeeSchedule,
  compact = false,
}: InvestorKpiChipsProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const chips = [
    {
      label: "Total AUM",
      value: formatCurrency(totalAum),
      icon: DollarSign,
      variant: "default" as const,
    },
    {
      label: "Active Funds",
      value: activeFundsCount.toString(),
      icon: Briefcase,
      variant: "secondary" as const,
    },
    {
      label: "Pending Withdrawals",
      value: pendingWithdrawalsCount.toString(),
      icon: Clock,
      variant: pendingWithdrawalsCount > 0 ? "destructive" as const : "secondary" as const,
    },
    {
      label: "Last Report",
      value: lastReportPeriod || "None",
      icon: FileText,
      variant: "outline" as const,
    },
    {
      label: "IB Linked",
      value: hasIbLinked ? "Yes" : "No",
      icon: Users,
      variant: hasIbLinked ? "default" as const : "outline" as const,
    },
    {
      label: "Fee Schedule",
      value: hasFeeSchedule ? "Yes" : "No",
      icon: Percent,
      variant: hasFeeSchedule ? "default" as const : "outline" as const,
    },
  ];

  return (
    <TooltipProvider>
      <div className={cn(
        "flex flex-wrap gap-2",
        compact && "gap-1.5"
      )}>
        {chips.map((chip) => (
          <Tooltip key={chip.label}>
            <TooltipTrigger asChild>
              <Badge 
                variant={chip.variant}
                className={cn(
                  "flex items-center gap-1.5 cursor-default",
                  compact ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1"
                )}
              >
                <chip.icon className={cn(
                  "shrink-0",
                  compact ? "h-3 w-3" : "h-3.5 w-3.5"
                )} />
                <span className="font-medium">{chip.value}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{chip.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
