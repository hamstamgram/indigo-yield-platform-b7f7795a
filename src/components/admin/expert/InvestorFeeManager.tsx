import type React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { UnifiedInvestorData } from '@/services/expertInvestorService';
import { formatAssetValue } from '@/utils/kpiCalculations';

interface InvestorFeeManagerProps {
  investor: UnifiedInvestorData;
  fees: {
    totalFeesCollected: number;
    monthlyFees: number;
    yearToDateFees: number;
}

const InvestorFeeManager: React.FC<InvestorFeeManagerProps> = ({
  investor,
  fees,
}) => {
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
            <p className="text-xs text-muted-foreground">
              Since inception
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Fees</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAssetValue(fees.monthlyFees)}</div>
            <p className="text-xs text-muted-foreground">
              Current month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Fees</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAssetValue(fees.yearToDateFees)}</div>
            <p className="text-xs text-muted-foreground">
              Year to date
            </p>
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
                <p className="text-sm text-muted-foreground">
                  Applied to gross yield
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="estimated-monthly">Estimated Monthly Fee</Label>
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {formatAssetValue(investor.totalAum * investor.feePercentage * 0.072 / 12)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on 7.2% APY assumption
                </p>
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
                <span className="font-mono">{formatAssetValue(investor.totalAum * 0.072 * investor.feePercentage)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-4">
            <Button variant="outline">
              View Fee History
            </Button>
            <Button variant="outline">
              Generate Fee Statement
            </Button>
            <Button variant="outline">
              Adjust Fee Rate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fee Collection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Status</CardTitle>
          <CardDescription>
            Current status of fee collection and processing
          </CardDescription>
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
                <div className="text-sm text-muted-foreground">
                  Most recent fee collection date
                </div>
              </div>
              <div className="font-mono text-sm">
                {new Date().toLocaleDateString()}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Next Collection</div>
                <div className="text-sm text-muted-foreground">
                  Estimated next collection date
                </div>
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