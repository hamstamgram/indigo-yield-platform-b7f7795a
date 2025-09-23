import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface YieldManagementPanelProps {
  onDataChange: () => void;
}

export function YieldManagementPanel({ onDataChange }: YieldManagementPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Yield Management</CardTitle>
        <CardDescription>
          Manage daily yield rates and distribution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Yield management features coming soon...
          </p>
          <Button onClick={onDataChange} variant="outline">
            Refresh Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}