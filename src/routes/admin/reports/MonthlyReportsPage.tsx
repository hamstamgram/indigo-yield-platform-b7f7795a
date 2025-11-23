import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { generateReportForInvestor } from "@/lib/report-generator";

export default function MonthlyReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [generatedReports, setGeneratedReports] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateReports = async () => {
    setIsLoading(true);
    setGeneratedReports([]);

    try {
      const { data: investors, error } = await supabase
        .from("investors")
        .select("id")
        .eq("status", "active");

      if (error) throw error;

      const reports: string[] = [];
      for (const investor of investors) {
        const report = await generateReportForInvestor(investor.id, selectedMonth + "-01");
        reports.push(report);
      }
      setGeneratedReports(reports);
    } catch (error) {
      console.error("Error generating reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Generate Monthly Investor Reports</h1>
        <p className="text-muted-foreground">
          Generate HTML reports for all investors for a selected month.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Select Month</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="p-2 border rounded-lg"
          />
          <Button onClick={handleGenerateReports} className="mt-4" disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate Reports for All Investors"}
          </Button>
        </CardContent>
      </Card>
      {generatedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedReports.map((report, index) => (
              <div key={index}>
                <h3 className="text-lg font-semibold mb-2">Report {index + 1}</h3>
                <div
                  className="p-4 border rounded-lg bg-white"
                  dangerouslySetInnerHTML={{ __html: report }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
