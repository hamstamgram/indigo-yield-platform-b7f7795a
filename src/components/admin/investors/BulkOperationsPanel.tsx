import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { AlertTriangle } from "lucide-react";

const BulkOperationsPanel = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Operations</CardTitle>
        <CardDescription>Bulk import/export is disabled in this build.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 text-yellow-700">
          <AlertTriangle className="h-5 w-5" />
          <span>Use individual position updates; bulk CSV is not available.</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkOperationsPanel;
