import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Target, Shield, CheckCircle, Info, Bitcoin, Coins } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import type { OnboardingData, FundConfiguration } from "@/types/domains";

interface FundSelectionStepProps {
  data: OnboardingData;
  availableFunds: FundConfiguration[];
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onComplete: () => void;
}

// Fund performance data (would come from API in real implementation)
const FUND_PERFORMANCE_DATA: Record<
  string,
  {
    ytd_return: number;
    monthly_yield: number;
    volatility: number;
    min_investment: number;
    currency_symbol: string;
  }
> = {
  BTC_YIELD: {
    ytd_return: 12.4,
    monthly_yield: 0.85,
    volatility: 18.2,
    min_investment: 1000,
    currency_symbol: "BTC",
  },
  ETH_YIELD: {
    ytd_return: 15.1,
    monthly_yield: 1.02,
    volatility: 22.8,
    min_investment: 500,
    currency_symbol: "ETH",
  },
  STABLE_YIELD: {
    ytd_return: 6.8,
    monthly_yield: 0.52,
    volatility: 2.1,
    min_investment: 100,
    currency_symbol: "USDT",
  },
};

const FundSelectionStep: React.FC<FundSelectionStepProps> = ({
  data,
  availableFunds,
  onUpdate,
  onComplete,
}) => {
  const [selectedFunds, setSelectedFunds] = useState<string[]>(data.selected_funds || []);
  const [isValid, setIsValid] = useState(false);

  const validateStep = useCallback(() => {
    // At least one fund must be selected
    const valid = selectedFunds.length > 0;
    setIsValid(valid);

    // Update parent data
    onUpdate({
      selected_funds: selectedFunds,
    });

    // Mark step as complete if valid
    if (valid) {
      onComplete();
    }
  }, [selectedFunds, onUpdate, onComplete]);

  useEffect(() => {
    validateStep();
  }, [selectedFunds, validateStep]);

  const handleFundSelection = (fundCode: string, selected: boolean) => {
    if (selected) {
      setSelectedFunds((prev) => [...prev, fundCode]);
    } else {
      setSelectedFunds((prev) => prev.filter((code) => code !== fundCode));
    }
  };

  const getFundIcon = (benchmark: string) => {
    switch (benchmark) {
      case "BTC":
        return <Bitcoin className="w-6 h-6 text-orange-500" />;
      case "ETH":
        return <CryptoIcon symbol="ETH" className="w-6 h-6" />;
      case "STABLE":
        return <Coins className="w-6 h-6 text-blue-500" />;
      default:
        return <Target className="w-6 h-6 text-gray-500" />;
    }
  };

  const getRiskLevel = (volatility: number) => {
    if (volatility < 5) return { level: "Low", color: "text-green-600", bg: "bg-green-100" };
    if (volatility < 15) return { level: "Medium", color: "text-yellow-600", bg: "bg-yellow-100" };
    return { level: "High", color: "text-red-600", bg: "bg-red-100" };
  };

  // Format in native tokens (no fiat currency - platform uses crypto tokens)
  const formatTokenAmount = (amount: number, symbol?: string) => {
    const decimals = symbol === "BTC" ? 8 : symbol === "ETH" ? 6 : 2;
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    }).format(amount);
    return symbol ? `${formatted} ${symbol}` : formatted;
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header Alert */}
      <Alert>
        <Target className="h-4 w-4" />
        <AlertDescription>
          Select one or more funds that align with your investment goals and risk tolerance. You can
          modify your selection later in your account settings.
        </AlertDescription>
      </Alert>

      {/* Selection Summary */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Fund Selection</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {selectedFunds.length} fund{selectedFunds.length === 1 ? "" : "s"} selected
              </p>
            </div>
            <Badge variant={selectedFunds.length > 0 ? "default" : "secondary"}>
              {selectedFunds.length > 0 ? "Ready" : "Select Funds"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Available Funds */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Available Funds</h3>

        {availableFunds.map((fund) => {
          const isSelected = selectedFunds.includes(fund.code);
          const performanceData = FUND_PERFORMANCE_DATA[fund.code];
          const riskLevel = performanceData ? getRiskLevel(performanceData.volatility) : null;

          return (
            <Card
              key={fund.code}
              className={`transition-colors cursor-pointer ${
                isSelected
                  ? "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800"
                  : "hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-white dark:bg-gray-800 border">
                      {getFundIcon(fund.benchmark)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {fund.name}
                        {isSelected && <CheckCircle className="w-4 h-4 text-green-600" />}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Yield-generating strategy based on {fund.benchmark}
                        {fund.benchmark === "STABLE" ? "coins" : ""}
                      </CardDescription>

                      {/* Performance Metrics */}
                      {performanceData && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">YTD Return</p>
                            <p
                              className={`font-semibold ${
                                performanceData.ytd_return > 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {formatPercentage(performanceData.ytd_return)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Monthly Yield</p>
                            <p className="font-semibold text-blue-600">
                              {formatPercentage(performanceData.monthly_yield)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Risk Level</p>
                            {riskLevel && (
                              <Badge
                                variant="secondary"
                                className={`${riskLevel.bg} ${riskLevel.color} text-xs`}
                              >
                                {riskLevel.level}
                              </Badge>
                            )}
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Min Investment</p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {formatTokenAmount(performanceData.min_investment, performanceData.currency_symbol)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Fund Details */}
                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Management Fee:</span>{" "}
                          {fund.mgmt_fee_bps / 100}%
                        </div>
                        <div>
                          <span className="font-medium">Performance Fee:</span>{" "}
                          {fund.perf_fee_bps / 100}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`fund-${fund.code}`}
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleFundSelection(fund.code, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`fund-${fund.code}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Include this fund in my portfolio
                  </label>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selection Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-gray-900 dark:text-white mb-2">
                Important Information
              </p>
              <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                <li>• You can select multiple funds to diversify your portfolio</li>
                <li>• Fund allocations can be adjusted after completing onboarding</li>
                <li>• All performance data shown is historical and not guaranteed</li>
                <li>• Minimum investment amounts apply per fund</li>
                <li>• Funds can be added or removed from your portfolio at any time</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Selection Warning */}
      {selectedFunds.length === 0 && (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Please select at least one fund to proceed with your investment.
          </AlertDescription>
        </Alert>
      )}

      {/* Completion Status */}
      {isValid && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Fund selection complete! You're ready to complete your onboarding and start earning
            yield.
          </AlertDescription>
        </Alert>
      )}

      {/* Risk Disclaimer */}
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                Risk Disclosure
              </p>
              <p className="text-yellow-800 dark:text-yellow-200">
                All investments carry risk, including potential loss of principal.
                Cryptocurrency-based funds are subject to high volatility and regulatory risks.
                Please ensure you understand the risks before proceeding.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FundSelectionStep;
