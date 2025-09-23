import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WithdrawalRequestsPanelProps {
  onDataChange: () => void;
}

export function WithdrawalRequestsPanel({ onDataChange }: WithdrawalRequestsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdrawal Requests</CardTitle>
        <CardDescription>
          Review and process withdrawal requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Withdrawal management features coming soon...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}