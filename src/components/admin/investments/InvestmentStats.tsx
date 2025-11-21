import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import type { Investment } from "@/types/investment";

interface InvestmentStatsProps {
  investments: Investment[];
}

export function InvestmentStats({ investments }: InvestmentStatsProps) {
  const pending = investments.filter((i) => i.status === "pending");
  const active = investments.filter((i) => i.status === "active");
  const rejected = investments.filter((i) => i.status === "rejected");

  const totalActive = active.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalPending = pending.reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Active</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalActive.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">{active.length} investments</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalPending.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">{pending.length} pending</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Approved</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{active.length}</div>
          <p className="text-xs text-muted-foreground">Active investments</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{rejected.length}</div>
          <p className="text-xs text-muted-foreground">Rejected/Cancelled</p>
        </CardContent>
      </Card>
    </div>
  );
}
