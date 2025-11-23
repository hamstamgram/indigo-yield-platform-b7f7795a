import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SystemHealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Health</h1>
        <p className="text-muted-foreground">
          Monitor the health and performance of the application.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            System health metrics will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
