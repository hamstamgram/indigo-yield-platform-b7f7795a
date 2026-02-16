/**
 * Report Builder Component
 * Custom report generation feature is not yet available.
 */

import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

interface ReportBuilderProps {
  defaultReportType?: string;
  onReportGenerated?: (reportId: string) => void;
}

export const ReportBuilder: React.FC<ReportBuilderProps> = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generate Report
        </CardTitle>
        <CardDescription>
          Configure and generate professional reports for your portfolio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Feature Unavailable</h3>
          <p className="text-muted-foreground">
            Custom report generation is not yet available. Use the Statements section to generate investor statements.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
