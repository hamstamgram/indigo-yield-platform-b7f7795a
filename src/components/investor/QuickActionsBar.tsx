import {
  Button,
  Card, CardContent,
} from "@/components/ui";
import { 
  ArrowUpFromLine, 
  FileText, 
  HelpCircle,
  ChevronRight,
  Wallet
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  variant?: "primary" | "outline" | "ghost";
  highlight?: boolean;
}

const quickActions: QuickAction[] = [
  {
    label: "Request Withdrawal",
    description: "Submit a withdrawal request",
    icon: <ArrowUpFromLine className="h-5 w-5" />,
    href: "/withdrawals/request",
    variant: "primary",
    highlight: true,
  },
  {
    label: "View Statements",
    description: "Access your monthly reports",
    icon: <FileText className="h-5 w-5" />,
    href: "/statements",
    variant: "outline",
  },
  {
    label: "Portfolio Details",
    description: "Full position breakdown",
    icon: <Wallet className="h-5 w-5" />,
    href: "/portfolio",
    variant: "outline",
  },
  {
    label: "Get Support",
    description: "Contact our team",
    icon: <HelpCircle className="h-5 w-5" />,
    href: "/support",
    variant: "ghost",
  },
];

interface QuickActionsBarProps {
  className?: string;
  compact?: boolean;
}

export function QuickActionsBar({ className, compact = false }: QuickActionsBarProps) {
  const navigate = useNavigate();

  if (compact) {
    // Mobile-friendly compact row
    return (
      <div className={cn("flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0", className)}>
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            size="sm"
            className={cn(
              "flex-shrink-0 gap-2",
              action.highlight && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            onClick={() => navigate(action.href)}
          >
            {action.icon}
            <span className="whitespace-nowrap">{action.label}</span>
          </Button>
        ))}
      </div>
    );
  }

  // Full grid layout for larger screens
  return (
    <Card className={cn("bg-gradient-to-br from-muted/30 to-muted/10 border-muted", className)}>
      <CardContent className="p-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.href)}
              className={cn(
                "group flex flex-col items-start p-3 rounded-lg border bg-background/50 hover:bg-background transition-all text-left",
                action.highlight && "border-primary/30 bg-primary/5 hover:bg-primary/10"
              )}
            >
              <div className={cn(
                "p-2 rounded-md mb-2",
                action.highlight 
                  ? "bg-primary/10 text-primary" 
                  : "bg-muted text-muted-foreground group-hover:text-foreground"
              )}>
                {action.icon}
              </div>
              <span className="text-sm font-semibold">{action.label}</span>
              <span className="text-xs text-muted-foreground line-clamp-1">
                {action.description}
              </span>
              <ChevronRight className="h-4 w-4 mt-2 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
