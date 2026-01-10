import React from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Badge, Progress, Skeleton,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui";
import {
  AlertTriangle,
  CheckCircle,
  MailX,
  FileText,
  UserX,
  Clock,
  XCircle,
  HelpCircle,
  Info,
} from "lucide-react";
import { useDeliveryExclusionBreakdown } from "@/hooks/data";

interface DeliveryExclusionStatsProps {
  periodId: string;
}

export function DeliveryExclusionStats({ periodId }: DeliveryExclusionStatsProps) {
  const { data: breakdown, isLoading } = useDeliveryExclusionBreakdown(periodId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!breakdown) return null;

  const deliveryRate = breakdown.statementsGenerated > 0
    ? Math.round((breakdown.alreadySent / breakdown.statementsGenerated) * 100)
    : 0;

  return (
    <Card className="border-blue-200 dark:border-blue-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              Delivery Eligibility Breakdown
            </CardTitle>
            <CardDescription className="mt-1">
              Why some investors may not receive emails
            </CardDescription>
          </div>
          <Badge variant={deliveryRate === 100 ? "default" : deliveryRate > 50 ? "secondary" : "destructive"}>
            {deliveryRate}% delivered
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar showing overall funnel */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Delivery funnel</span>
            <span className="font-medium">
              {breakdown.alreadySent} of {breakdown.statementsGenerated} sent
            </span>
          </div>
          <Progress value={deliveryRate} className="h-2" />
        </div>

        {/* Breakdown grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Statements Generated */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Statements</span>
                  </div>
                  <p className="text-xl font-bold text-primary">{breakdown.statementsGenerated}</p>
                  <p className="text-xs text-muted-foreground">generated</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total statements generated for this period</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Already Sent */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-muted-foreground">Sent</span>
                  </div>
                  <p className="text-xl font-bold text-green-600">{breakdown.alreadySent}</p>
                  <p className="text-xs text-muted-foreground">delivered</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Emails successfully sent or delivered</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Queued */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs font-medium text-muted-foreground">Pending</span>
                  </div>
                  <p className="text-xl font-bold text-yellow-600">{breakdown.queued}</p>
                  <p className="text-xs text-muted-foreground">in queue</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Emails waiting to be sent</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Failed */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`p-3 rounded-lg border ${
                  breakdown.failed > 0 
                    ? "bg-destructive/5 border-destructive/20" 
                    : "bg-muted/50 border-border"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className={`h-4 w-4 ${breakdown.failed > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium text-muted-foreground">Failed</span>
                  </div>
                  <p className={`text-xl font-bold ${breakdown.failed > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {breakdown.failed}
                  </p>
                  <p className="text-xs text-muted-foreground">need retry</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Failed, bounced, or complained emails</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Exclusion reasons section - only show if there are exclusions */}
        {(breakdown.missingEmail > 0 || breakdown.noStatement > 0 || breakdown.cancelled > 0) && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Excluded from delivery</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {breakdown.missingEmail > 0 && (
                <div className="flex items-center gap-3 p-2 rounded bg-amber-500/5 border border-amber-500/20">
                  <MailX className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      {breakdown.missingEmail} missing email
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Investor has no email address
                    </p>
                  </div>
                </div>
              )}
              
              {breakdown.noStatement > 0 && (
                <div className="flex items-center gap-3 p-2 rounded bg-muted/50 border">
                  <UserX className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {breakdown.noStatement} no statement
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      No position or inactive
                    </p>
                  </div>
                </div>
              )}

              {breakdown.cancelled > 0 && (
                <div className="flex items-center gap-3 p-2 rounded bg-muted/50 border">
                  <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {breakdown.cancelled} cancelled
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Manually cancelled
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help text when nothing to send */}
        {breakdown.statementsGenerated === 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <HelpCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                No statements to deliver
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Generate statements for this period first before sending emails.
                Go to Investor Reports → Generate Statements.
              </p>
            </div>
          </div>
        )}

        {breakdown.statementsGenerated > 0 && breakdown.alreadySent === breakdown.statementsGenerated && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                All statements delivered!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Every generated statement has been successfully sent.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
