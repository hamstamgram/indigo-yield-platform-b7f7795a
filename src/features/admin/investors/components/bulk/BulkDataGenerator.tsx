import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
  Progress,
  Badge,
} from "@/components/ui";
import { Calendar, Plus, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { useGenerateTemplates } from "@/features/admin/reports/hooks/useReportData";
const BulkDataGenerator: React.FC = () => {
  const [startMonth, setStartMonth] = useState("2024-06");
  const [endMonth, setEndMonth] = useState("2024-09");
  const [progress, setProgress] = useState(0);

  const { generateTemplates, isGenerating, result, reset } = useGenerateTemplates();

  const handleGenerate = async () => {
    setProgress(0);

    // Simulate progress (real implementation would have actual progress updates)
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    try {
      await generateTemplates({
        startMonth,
        endMonth,
      });
    } finally {
      clearInterval(progressInterval);
      setProgress(100);
    }
  };

  const resetForm = () => {
    reset();
    setProgress(0);
    setStartMonth("2024-06");
    setEndMonth("2024-09");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Bulk Data Generator
        </CardTitle>
        <CardDescription>
          Generate historical report templates for missing periods across all investors and assets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startMonth">Start Month</Label>
            <Input
              id="startMonth"
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              disabled={isGenerating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endMonth">End Month</Label>
            <Input
              id="endMonth"
              type="month"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              disabled={isGenerating}
            />
          </div>
        </div>

        {/* Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Generating templates...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Result */}
        {result && (
          <Alert className={result.success ? "border-green-500" : "border-yellow-500"}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-yield" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={result.success ? "default" : "secondary"}>
                      {result.generated} templates generated
                    </Badge>
                    {result.errors.length > 0 && (
                      <Badge variant="destructive">{result.errors.length} errors</Badge>
                    )}
                  </div>

                  {result.errors.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium">Errors encountered:</p>
                      <ul className="list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                        {result.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {result.errors.length > 5 && (
                          <li>... and {result.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !startMonth || !endMonth}
            className="flex-1"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Generate Historical Templates
          </Button>

          {result && (
            <Button variant="outline" onClick={resetForm} disabled={isGenerating}>
              Reset
            </Button>
          )}
        </div>

        {/* Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            This will create report templates for all active investors and assets between the
            specified months. Existing templates will be skipped to avoid duplicates.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default BulkDataGenerator;
