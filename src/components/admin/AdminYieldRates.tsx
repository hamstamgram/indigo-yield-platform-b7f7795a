import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks";
import { Loader2, Save } from "lucide-react";
import { yieldRatesService, type YieldRate } from "@/services/shared";

const AdminYieldRates = () => {
  const [yieldRates, setYieldRates] = useState<YieldRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Create today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const enrichedRates = await yieldRatesService.getEnrichedByDate(today);
        setYieldRates(enrichedRates);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch yield rate data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast, today]);

  const handleYieldChange = (assetId: number, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setYieldRates((prev) =>
      prev.map((rate) =>
        rate.asset_id === assetId ? { ...rate, daily_yield_percentage: numValue } : rate
      )
    );
  };

  const saveYieldRates = async () => {
    try {
      setSaving(true);
      await yieldRatesService.saveAll(yieldRates, today);

      toast({
        title: "Success",
        description: "Yield rates saved successfully",
      });

      // Refresh data after saving
      const refreshedRates = await yieldRatesService.getEnrichedByDate(today);
      setYieldRates(refreshedRates);
    } catch (error) {
      console.error("Error saving yield rates:", error);
      toast({
        title: "Error",
        description: "Failed to save yield rates",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yield Rate Management</CardTitle>
        <CardDescription>Set daily yield rates for all assets</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="w-[200px]">Daily Yield (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yieldRates.map((rate) => (
                    <TableRow key={rate.asset_id}>
                      <TableCell>{rate.asset_name}</TableCell>
                      <TableCell>{rate.asset_symbol}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={rate.daily_yield_percentage}
                          onChange={(e) => handleYieldChange(rate.asset_id, e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={saveYieldRates} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Yield Rates
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminYieldRates;
