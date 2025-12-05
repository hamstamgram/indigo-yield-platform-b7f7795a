import type React from "react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DollarSign, TrendingUp, Calendar, History, FileText, Percent } from "lucide-react";
import { UnifiedInvestorData } from "@/services/expertInvestorService";
import { formatAssetValue } from "@/utils/kpiCalculations";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface InvestorFeeManagerProps {
  investor: UnifiedInvestorData;
  fees: {
    totalFeesCollected: number;
    monthlyFees: number;
    yearToDateFees: number;
  };
}

const InvestorFeeManager: React.FC<InvestorFeeManagerProps> = ({ investor, fees }) => {
  const { toast } = useToast();
  const [showFeeHistory, setShowFeeHistory] = useState(false);
  const [showAdjustRate, setShowAdjustRate] = useState(false);
  const [newFeeRate, setNewFeeRate] = useState((investor.feePercentage * 100).toFixed(2));
  const [isUpdating, setIsUpdating] = useState(false);
  const [feeHistory, setFeeHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleViewFeeHistory = async () => {
    setShowFeeHistory(true);
    setLoadingHistory(true);
    try {
      // Use fee_calculations table instead of platform_fees_collected
      const { data, error } = await supabase
        .from("fee_calculations")
        .select("*")
        .eq("investor_id", investor.id)
        .order("calculation_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      setFeeHistory(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load fee history",
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleGenerateFeeStatement = () => {
    toast({
      title: "Fee Statement",
      description: "Fee statement generation is available in the Investor Reports section",
    });
  };

  const handleAdjustFeeRate = async () => {
    setIsUpdating(true);
    try {
      const newRate = parseFloat(newFeeRate) / 100;
      if (isNaN(newRate) || newRate < 0 || newRate > 1) {
        throw new Error("Invalid fee rate. Must be between 0% and 100%");
      }

      const { error } = await supabase
        .from("profiles")
        .update({ fee_percentage: newRate })
        .eq("id", investor.profileId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Fee rate updated to ${newFeeRate}%`,
      });
      setShowAdjustRate(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update fee rate",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Build investor name from available fields
  const investorName = investor.firstName
    ? `${investor.firstName} ${investor.lastName || ""}`.trim()
    : investor.email || "Investor";

  return (
    <div className="space-y-6">
      {/* Fee Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAssetValue(fees.totalFeesCollected)}</div>
            <p className="text-xs text-muted-foreground">Since inception</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Fees</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAssetValue(fees.monthlyFees)}</div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Fees</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAssetValue(fees.yearToDateFees)}</div>
            <p className="text-xs text-muted-foreground">Year to date</p>
          </CardContent>
        </Card>
      </div>

      {/* Fee Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Configuration</CardTitle>
          <CardDescription>
            Manage fee rates and collection preferences for this investor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="current-fee-rate">Current Fee Rate</Label>
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {(investor.feePercentage * 100).toFixed(2)}%
                </div>
                <p className="text-sm text-muted-foreground">Applied to gross yield</p>
              </div>
            </div>

            <div>
              <Label htmlFor="estimated-monthly">Estimated Monthly Fee</Label>
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {formatAssetValue((investor.totalAum * investor.feePercentage * 0.072) / 12)}
                </div>
                <p className="text-sm text-muted-foreground">Based on 7.2% APY assumption</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Fee Calculation Details */}
          <div>
            <h4 className="font-medium mb-4">Fee Calculation Breakdown</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>Total AUM:</span>
                <span className="font-mono">{formatAssetValue(investor.totalAum)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>Fee Rate:</span>
                <span className="font-mono">{(investor.feePercentage * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>Estimated Annual Yield (7.2%):</span>
                <span className="font-mono">{formatAssetValue(investor.totalAum * 0.072)}</span>
              </div>
              <div className="flex justify-between p-2 bg-primary/10 rounded font-medium">
                <span>Estimated Annual Fee:</span>
                <span className="font-mono">
                  {formatAssetValue(investor.totalAum * 0.072 * investor.feePercentage)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-4">
            <Button variant="outline" onClick={handleViewFeeHistory}>
              <History className="h-4 w-4 mr-2" />
              View Fee History
            </Button>
            <Button variant="outline" onClick={handleGenerateFeeStatement}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Fee Statement
            </Button>
            <Button variant="outline" onClick={() => setShowAdjustRate(true)}>
              <Percent className="h-4 w-4 mr-2" />
              Adjust Fee Rate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fee History Dialog */}
      <Dialog open={showFeeHistory} onOpenChange={setShowFeeHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fee History</DialogTitle>
            <DialogDescription>Historical fee collections for {investorName}</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {loadingHistory ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : feeHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No fee history found</div>
            ) : (
              <div className="space-y-2">
                {feeHistory.map((fee) => (
                  <div key={fee.id} className="flex justify-between p-3 bg-muted/50 rounded">
                    <div>
                      <div className="font-medium">{fee.fee_type || "Platform Fee"}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(fee.calculation_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">{formatAssetValue(fee.fee_amount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeeHistory(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Fee Rate Dialog */}
      <Dialog open={showAdjustRate} onOpenChange={setShowAdjustRate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Fee Rate</DialogTitle>
            <DialogDescription>Update the fee percentage for {investorName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-fee-rate">New Fee Rate (%)</Label>
              <Input
                id="new-fee-rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={newFeeRate}
                onChange={(e) => setNewFeeRate(e.target.value)}
                placeholder="e.g., 10.00"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Current rate: {(investor.feePercentage * 100).toFixed(2)}%
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustRate(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustFeeRate} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fee Collection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Status</CardTitle>
          <CardDescription>Current status of fee collection and processing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Auto Collection</div>
                <div className="text-sm text-muted-foreground">
                  Fees are automatically collected during yield distribution
                </div>
              </div>
              <div className="text-green-600 font-medium">Enabled</div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Last Collection</div>
                <div className="text-sm text-muted-foreground">Most recent fee collection date</div>
              </div>
              <div className="font-mono text-sm">{new Date().toLocaleDateString()}</div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Next Collection</div>
                <div className="text-sm text-muted-foreground">Estimated next collection date</div>
              </div>
              <div className="font-mono text-sm">
                {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestorFeeManager;
