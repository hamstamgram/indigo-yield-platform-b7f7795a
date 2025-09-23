import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvestorSummaryV2 } from "@/services/adminServiceV2";

interface InvestorManagementPanelProps {
  investors: InvestorSummaryV2[];
  onDataChange: () => void;
}

export function InvestorManagementPanel({ investors, onDataChange }: InvestorManagementPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Investor Management</CardTitle>
        <CardDescription>
          Manage investor accounts and positions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Found {investors.length} investors. Management features coming soon...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}