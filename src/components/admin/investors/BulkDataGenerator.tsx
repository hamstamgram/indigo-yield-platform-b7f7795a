import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks";
import {
  generateMissingTemplates,
  type BulkGenerateOptions,
} from "@/services/shared/historicalDataService";

interface GenerationResult {
  success: boolean;
  generated: number;
  errors: string[];
}

const BulkDataGenerator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [startMonth, setStartMonth] = useState("2024-06");
  const [endMonth, setEndMonth] = useState("2024-09");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setProgress(0);
      setResult(null);

      // Simulate progress (real implementation would have actual progress updates)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const options: BulkGenerateOptions = {
        startMonth: startMonth,
        endMonth: endMonth,
      };

      const generateResult = await generateMissingTemplates(options);

      clearInterval(progressInterval);
      setProgress(100);
      setResult(generateResult);

      if (generateResult.success) {
        toast({
          title: "Success",
          description: `Generated ${generateResult.generated} historical report templates`,
        });
      } else {
        toast({
          title: "Partial Success",
          description: `Generated ${generateResult.generated} templates with ${generateResult.errors.length} errors`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating templates:", error);
      toast({
        title: "Error",
        description: "Failed to generate historical report templates",
        variant: "destructive",
      });
      setResult({
        success: false,
        generated: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResult(null);
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
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endMonth">End Month</Label>
            <Input
              id="endMonth"
              type="month"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Progress */}
        {loading && (
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
                <CheckCircle className="h-4 w-4 text-green-600" />
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
            disabled={loading || !startMonth || !endMonth}
            className="flex-1"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Generate Historical Templates
          </Button>

          {result && (
            <Button variant="outline" onClick={resetForm} disabled={loading}>
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
