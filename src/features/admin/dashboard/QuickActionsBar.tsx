/**
 * Quick Actions Bar Component
 * Provides fast access to common admin operations
 */

import { useNavigate } from "react-router-dom";
import { ArrowDownCircle, ArrowUpCircle, FileText, Users, Zap } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { formatShortcut, SHORTCUTS } from "@/hooks";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  shortcut?: { key: string; meta?: boolean; shift?: boolean };
  variant?: "default" | "primary" | "warning";
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "transaction",
    label: "Transactions",
    icon: <ArrowDownCircle className="h-4 w-4" />,
    href: "/admin/transactions",
    variant: "primary",
  },
  {
    id: "withdrawal",
    label: "Withdrawals",
    icon: <ArrowUpCircle className="h-4 w-4" />,
    href: "/admin/withdrawals",
    variant: "warning",
  },
  {
    id: "reports",
    label: "Reports",
    icon: <FileText className="h-4 w-4" />,
    href: "/admin/investor-reports",
    shortcut: SHORTCUTS.QUICK_REPORT,
  },
  {
    id: "investors",
    label: "Investors",
    icon: <Users className="h-4 w-4" />,
    href: "/admin/investors",
    shortcut: SHORTCUTS.QUICK_INVESTOR,
  },
];

export function QuickActionsBar() {
  const navigate = useNavigate();

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Quick Actions</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Tooltip key={action.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={
                    action.variant === "primary"
                      ? "primary"
                      : action.variant === "warning"
                        ? "outline"
                        : "secondary"
                  }
                  size="sm"
                  className={`gap-2 ${action.variant === "warning" ? "border-amber-500/50 hover:bg-amber-500/10" : ""}`}
                  onClick={() => navigate(action.href)}
                >
                  {action.icon}
                  <span className="hidden sm:inline">{action.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="flex items-center gap-2">
                  <span>{action.label}</span>
                  {action.shortcut && (
                    <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">
                      {formatShortcut(action.shortcut)}
                    </kbd>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
