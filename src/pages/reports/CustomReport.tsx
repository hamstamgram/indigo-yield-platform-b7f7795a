/**
 * Custom Report Builder Page
 */

import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportBuilder } from "@/components/reports/ReportBuilder";

export default function CustomReport() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Custom Report Builder
          </h1>
          <p className="text-muted-foreground mt-2">
            Create a custom report with your specific parameters
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Build Your Report</CardTitle>
          <CardDescription>Select the report type and configure your preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Choose from various report types and customize the date range, format, and included
            sections to create a report tailored to your needs.
          </p>
        </CardContent>
      </Card>

      <ReportBuilder />
    </div>
  );
}
