import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Clock, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const InterestCalculationEngine: React.FC = () => {
  const { toast } = useToast();

  const handleCalculateInterest = () => {
    toast({
      title: "Feature Under Maintenance",
      description:
        "Interest calculation is being updated for the new database schema. Please check back soon.",
      variant: "destructive",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Interest Calculation Engine
        </CardTitle>
        <CardDescription>
          Apply daily interest to all investor portfolios based on configured yield rates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Info className="h-5 w-5 text-yellow-600" />
          <div className="text-sm text-yellow-800">
            This feature is temporarily unavailable while we update the database schema. All
            existing investor data remains safe and accessible.
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last calculation: Never
          </div>
          <div className="text-sm text-muted-foreground">Total portfolios: 0</div>
        </div>

        <Button onClick={handleCalculateInterest} className="w-full" disabled>
          <Calculator className="mr-2 h-4 w-4" />
          Calculate Interest (Temporarily Disabled)
        </Button>
      </CardContent>
    </Card>
  );
};

export default InterestCalculationEngine;
