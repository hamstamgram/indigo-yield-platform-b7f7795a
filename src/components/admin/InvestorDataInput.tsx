/**
 * Investor Data Input Component
 *
 * Allows admins to input monthly performance data for investors
 * Supports all 6 fund types with MTD/QTD/YTD/ITD metrics
 */

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { statementsApi, type InvestorFundPerformance } from "@/services/api/statementsApi";

const FUND_NAMES = [
  "BTC YIELD FUND",
  "ETH YIELD FUND",
  "SOL YIELD FUND",
  "STABLECOIN FUND",
  "EURC YIELD FUND",
  "TOKENIZED GOLD",
  "XRP YIELD FUND",
] as const;

// Validation schema for performance data
const performanceSchema = z.object({
  fund_name: z.string().min(1, "Fund name required"),

  // MTD
  mtd_beginning_balance: z.string().default("0"),
  mtd_additions: z.string().default("0"),
  mtd_redemptions: z.string().default("0"),
  mtd_net_income: z.string().default("0"),
  mtd_ending_balance: z.string().default("0"),
  mtd_rate_of_return: z.string().default("0"),

  // QTD
  qtd_beginning_balance: z.string().default("0"),
  qtd_additions: z.string().default("0"),
  qtd_redemptions: z.string().default("0"),
  qtd_net_income: z.string().default("0"),
  qtd_ending_balance: z.string().default("0"),
  qtd_rate_of_return: z.string().default("0"),

  // YTD
  ytd_beginning_balance: z.string().default("0"),
  ytd_additions: z.string().default("0"),
  ytd_redemptions: z.string().default("0"),
  ytd_net_income: z.string().default("0"),
  ytd_ending_balance: z.string().default("0"),
  ytd_rate_of_return: z.string().default("0"),

  // ITD
  itd_beginning_balance: z.string().default("0"),
  itd_additions: z.string().default("0"),
  itd_redemptions: z.string().default("0"),
  itd_net_income: z.string().default("0"),
  itd_ending_balance: z.string().default("0"),
  itd_rate_of_return: z.string().default("0"),
});

type PerformanceFormData = z.infer<typeof performanceSchema>;

interface InvestorDataInputProps {
  periodId: string;
  investorId: string;
  investorName: string;
  onSave?: () => void;
}

export function InvestorDataInput({
  periodId,
  investorId,
  investorName,
  onSave,
}: InvestorDataInputProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFund, setSelectedFund] = useState<string>(FUND_NAMES[0]);
  const [availableFunds, setAvailableFunds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<PerformanceFormData>({
    resolver: zodResolver(performanceSchema),
    defaultValues: {
      fund_name: selectedFund,
    },
  });

  const loadPerformanceData = useCallback(async () => {
    try {
      const { data, error }: { data: InvestorFundPerformance[] | null; error: string | null } =
        await statementsApi.getPerformanceData(periodId, investorId);
      if (error) throw new Error(error);

      const funds: Set<string> = new Set(data?.map((d) => d.fund_name) || []);
      setAvailableFunds(funds);

      // If we have data, load the first fund
      if (data && data.length > 0) {
        // Data loaded, no specific action needed here
      }
    } catch (error) {
      console.error("Load performance data error:", error);
    }
  }, [periodId, investorId]);

  const loadFundData = useCallback(
    async (fundName: string) => {
      try {
        const { data, error } = await statementsApi.getPerformanceData(periodId, investorId);
        if (error) throw new Error(error);

        const fundData = data?.find((d: any) => d.fund_name === fundName);
        if (fundData) {
          // Populate form with existing data
          Object.entries(fundData).forEach(([key, value]) => {
            if (
              key !== "id" &&
              key !== "period_id" &&
              key !== "user_id" &&
              key !== "created_at" &&
              key !== "updated_at"
            ) {
              setValue(key as keyof PerformanceFormData, value?.toString() || "0");
            }
          });
        } else {
          // Reset form for new fund
          reset({
            fund_name: fundName,
            mtd_beginning_balance: "0",
            mtd_additions: "0",
            mtd_redemptions: "0",
            mtd_net_income: "0",
            mtd_ending_balance: "0",
            mtd_rate_of_return: "0",
            qtd_beginning_balance: "0",
            qtd_additions: "0",
            qtd_redemptions: "0",
            qtd_net_income: "0",
            qtd_ending_balance: "0",
            qtd_rate_of_return: "0",
            ytd_beginning_balance: "0",
            ytd_additions: "0",
            ytd_redemptions: "0",
            ytd_net_income: "0",
            ytd_ending_balance: "0",
            ytd_rate_of_return: "0",
            itd_beginning_balance: "0",
            itd_additions: "0",
            itd_redemptions: "0",
            itd_net_income: "0",
            itd_ending_balance: "0",
            itd_rate_of_return: "0",
          });
        }
      } catch (error) {
        console.error("Load fund data error:", error);
      }
    },
    [periodId, investorId, reset, setValue]
  );

  // Load existing data for this investor
  useEffect(() => {
    loadPerformanceData();
  }, [loadPerformanceData]);

  // Update form when fund selection changes
  useEffect(() => {
    setValue("fund_name", selectedFund);
    loadFundData(selectedFund);
  }, [selectedFund, setValue, loadFundData]);

  const handleSaveData = async (data: PerformanceFormData) => {
    setIsLoading(true);
    try {
      const { error } = await statementsApi.savePerformanceData(
        periodId,
        investorId,
        selectedFund,
        data
      );

      if (error) throw new Error(error);

      toast({
        title: "Data Saved",
        description: `Performance data saved for ${selectedFund}`,
      });

      setAvailableFunds((prev) => {
        const newSet = new Set(prev);
        newSet.add(selectedFund);
        return newSet;
      });

      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error("Save data error:", error);
      toast({
        title: "Error",
        description: "Failed to save performance data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderMetricInputs = (prefix: "mtd" | "qtd" | "ytd" | "itd") => {
    const metrics = [
      { key: "beginning_balance", label: "Beginning Balance" },
      { key: "additions", label: "Additions" },
      { key: "redemptions", label: "Redemptions" },
      { key: "net_income", label: "Net Income" },
      { key: "ending_balance", label: "Ending Balance" },
      { key: "rate_of_return", label: "Rate of Return (%)" },
    ];

    return (
      <div className="space-y-4">
        {metrics.map(({ key, label }) => {
          const fieldName = `${prefix}_${key}` as keyof PerformanceFormData;
          return (
            <div key={fieldName} className="space-y-2">
              <Label htmlFor={fieldName}>{label}</Label>
              <Input id={fieldName} type="text" placeholder="0.00" {...register(fieldName)} />
              {errors[fieldName] && (
                <p className="text-sm text-destructive">
                  {String(errors[fieldName]?.message || "")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Data Input</CardTitle>
        <CardDescription>Enter monthly performance data for {investorName}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleSaveData)} className="space-y-6">
          {/* Fund Selection */}
          <div className="space-y-2">
            <Label htmlFor="fund_name">Fund</Label>
            <Select value={selectedFund} onValueChange={setSelectedFund}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUND_NAMES.map((fund) => (
                  <SelectItem key={fund} value={fund}>
                    {fund}
                    {availableFunds.has(fund) && (
                      <Badge variant="secondary" className="ml-2">
                        Saved
                      </Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabbed Input for MTD/QTD/YTD/ITD */}
          <Tabs defaultValue="mtd" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="mtd">MTD</TabsTrigger>
              <TabsTrigger value="qtd">QTD</TabsTrigger>
              <TabsTrigger value="ytd">YTD</TabsTrigger>
              <TabsTrigger value="itd">ITD</TabsTrigger>
            </TabsList>

            <TabsContent value="mtd" className="space-y-4">
              <h3 className="font-semibold text-lg">Month-to-Date</h3>
              {renderMetricInputs("mtd")}
            </TabsContent>

            <TabsContent value="qtd" className="space-y-4">
              <h3 className="font-semibold text-lg">Quarter-to-Date</h3>
              {renderMetricInputs("qtd")}
            </TabsContent>

            <TabsContent value="ytd" className="space-y-4">
              <h3 className="font-semibold text-lg">Year-to-Date</h3>
              {renderMetricInputs("ytd")}
            </TabsContent>

            <TabsContent value="itd" className="space-y-4">
              <h3 className="font-semibold text-lg">Inception-to-Date</h3>
              {renderMetricInputs("itd")}
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Data
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
