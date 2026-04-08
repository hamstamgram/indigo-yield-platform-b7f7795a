import { memo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { PieChart, AlertTriangle } from "lucide-react";
import {
  useConcentrationRisk,
  type ConcentrationRisk,
} from "@/features/admin/system/hooks/useRiskAlerts";
import { logWarn } from "@/lib/logger";

const concentrationConfig = {
  CRITICAL: { color: "bg-rose-500/10 text-rose-400", priority: 4 },
  HIGH: { color: "bg-orange-500/10 text-orange-400", priority: 3 },
  MEDIUM: { color: "bg-yellow-500/10 text-yellow-400", priority: 2 },
  LOW: { color: "bg-yield/10 text-yield", priority: 1 },
} as const;

const fallbackConcentrationConfig = concentrationConfig.LOW;

export const ConcentrationRiskPanel = memo(function ConcentrationRiskPanel() {
  const { data: concentrationData, isLoading } = useConcentrationRisk();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading concentration data...
        </CardContent>
      </Card>
    );
  }

  const safeConcentrationData = (concentrationData || []).filter(
    (item): item is ConcentrationRisk => Boolean(item && item.fund_id && item.investor_id)
  );

  const criticalCount =
    safeConcentrationData.filter((c) => c.concentration_level === "CRITICAL").length || 0;
  const highCount =
    safeConcentrationData.filter((c) => c.concentration_level === "HIGH").length || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Concentration Risk</CardTitle>
          </div>
          <div className="flex gap-2">
            {criticalCount > 0 && <Badge variant="destructive">{criticalCount} Critical</Badge>}
            {highCount > 0 && (
              <Badge variant="secondary" className="bg-orange-500/10 text-orange-400">
                {highCount} High
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {safeConcentrationData.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <PieChart className="h-8 w-8 mx-auto mb-2 text-yield" />
            <p>No concentration risks detected</p>
            <p className="text-xs">All investors below 20% threshold</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Fund</TableHead>
                  <TableHead className="whitespace-nowrap">Investor</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Position</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Own%</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {safeConcentrationData.map((item, idx) => {
                  if (
                    item.concentration_level &&
                    !concentrationConfig[
                      item.concentration_level as keyof typeof concentrationConfig
                    ]
                  ) {
                    logWarn("concentrationRisk.unexpectedLevel", {
                      fundId: item.fund_id,
                      investorId: item.investor_id,
                      concentrationLevel: item.concentration_level,
                    });
                  }
                  const config =
                    concentrationConfig[
                      item.concentration_level as keyof typeof concentrationConfig
                    ] ?? fallbackConcentrationConfig;
                  return (
                    <TableRow key={`${item.fund_id}-${item.investor_id}-${idx}`}>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {item.fund_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium py-1.5 truncate max-w-[120px]">
                        {item.investor_name}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums py-1.5">
                        {item.position_value?.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums py-1.5">
                        {item.ownership_pct?.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center py-1.5">
                        <Badge className={config.color}>
                          {item.concentration_level === "CRITICAL" && (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          )}
                          {item.concentration_level}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
