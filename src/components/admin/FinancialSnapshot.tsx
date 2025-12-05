import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, PieChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CryptoIcon } from "@/components/CryptoIcons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface FundSnapshot {
  fund_id: string; // Added ID for querying composition
  fund_name: string;
  asset_code: string;
  aum: number;
  daily_inflows: number;
  daily_outflows: number;
  net_flow_24h: number;
}

interface InvestorComposition {
  investor_name: string;
  email: string;
  balance: number;
  ownership_pct: number;
}

const formatCrypto = (value: number, symbol: string) => {
  if (!value) value = 0;
  const decimals = symbol === "BTC" ? 8 : symbol === "ETH" ? 6 : 2;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const FinancialSnapshot: React.FC = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [data, setData] = useState<FundSnapshot[]>([]);
  const [loading, setLoading] = useState(false);

  // Composition State
  const [selectedFundId, setSelectedFundId] = useState<string | null>(null);
  const [compositionData, setCompositionData] = useState<InvestorComposition[]>([]);
  const [loadingComp, setLoadingComp] = useState(false);

  const fetchData = async (targetDate: Date) => {
    setLoading(true);
    try {
      const formattedDate = format(targetDate, "yyyy-MM-dd");
      console.log("Fetching snapshot for:", formattedDate);

      // RPC needs to return fund_id now.
      // Note: previous SQL returned columns matching table definition.
      // We need to ensure get_historical_nav returns fund_id.
      // Wait, my SQL for get_historical_nav:
      // SELECT f.name, f.asset ... It did NOT select f.id as fund_id.
      // I MUST UPDATE THE RPC FIRST or I cannot link them.
      // Assuming I update the RPC below this code block in the plan.

      const { data: snapshot, error } = await supabase.rpc("get_historical_nav", {
        target_date: formattedDate,
      });

      if (error) throw error;
      setData(snapshot || []);

      // Reset selection on date change
      setSelectedFundId(null);
      setCompositionData([]);
    } catch (error) {
      console.error("Error fetching financial snapshot:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComposition = React.useCallback(
    async (fundId: string) => {
      if (!date) return;
      setLoadingComp(true);
      try {
        const formattedDate = format(date, "yyyy-MM-dd");
        const { data: comp, error } = await supabase.rpc("get_fund_composition", {
          p_fund_id: fundId,
          p_date: formattedDate,
        });

        if (error) throw error;
        setCompositionData(comp || []);
      } catch (error) {
        console.error("Error fetching composition", error);
      } finally {
        setLoadingComp(false);
      }
    },
    [date]
  );

  useEffect(() => {
    if (date) {
      fetchData(date);
    }
  }, [date]);

  useEffect(() => {
    if (selectedFundId) {
      fetchComposition(selectedFundId);
    }
  }, [selectedFundId, date, fetchComposition]);

  const selectedFund = data.find((f) => f.fund_id === selectedFundId);

  return (
    <div className="space-y-8">
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Fund Financials
          </h2>
          <p className="text-muted-foreground">Historical snapshot of AUM and daily flows.</p>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Snapshot Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {data.map((fund) => (
          <Card
            key={fund.fund_id || fund.asset_code}
            className={cn(
              "hover:shadow-md transition-all cursor-pointer border-l-4",
              selectedFundId === fund.fund_id ? "ring-2 ring-indigo-500 shadow-lg" : "",
              "border-l-indigo-500"
            )}
            onClick={() => setSelectedFundId(fund.fund_id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <CryptoIcon symbol={fund.asset_code} className="h-10 w-10" />
                <div>
                  <CardTitle className="text-lg font-bold">{fund.asset_code} Fund</CardTitle>
                  <p className="text-xs text-muted-foreground">{fund.fund_name}</p>
                </div>
              </div>
              {selectedFundId === fund.fund_id && <Badge className="bg-indigo-600">Selected</Badge>}
            </CardHeader>
            <CardContent>
              {/* Main AUM */}
              <div className="mt-4 mb-6">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCrypto(fund.aum, fund.asset_code)}{" "}
                  <span className="text-sm text-gray-500 font-normal">{fund.asset_code}</span>
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
                  Total Assets Under Management
                </p>
              </div>

              {/* Daily Flows Grid */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                {/* Inflows */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Deposits (24h)</p>
                  <p className="text-sm font-semibold text-green-600">
                    +{formatCrypto(fund.daily_inflows, fund.asset_code)}
                  </p>
                </div>

                {/* Outflows */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Withdrawals (24h)</p>
                  <p className="text-sm font-semibold text-red-600">
                    -{formatCrypto(fund.daily_outflows, fund.asset_code)}
                  </p>
                </div>

                {/* Net Flow */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Net Flow</p>
                  <p
                    className={cn(
                      "text-sm font-bold",
                      fund.net_flow_24h >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {fund.net_flow_24h > 0 ? "+" : ""}
                    {formatCrypto(fund.net_flow_24h, fund.asset_code)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Investor Composition Detail View */}
      {selectedFundId && selectedFund && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-t-4 border-t-indigo-600">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PieChart className="h-6 w-6 text-indigo-600" />
                  <div>
                    <CardTitle>Investor Composition</CardTitle>
                    <CardDescription>
                      Ownership breakdown for <strong>{selectedFund.fund_name}</strong> on{" "}
                      {date ? format(date, "PPP") : ""}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {formatCrypto(selectedFund.aum, selectedFund.asset_code)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Fund Size</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">
                      Balance ({selectedFund.asset_code})
                    </TableHead>
                    <TableHead className="text-right">Ownership Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingComp ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        Loading data...
                      </TableCell>
                    </TableRow>
                  ) : (
                    compositionData.map((investor, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{investor.investor_name}</TableCell>
                        <TableCell className="text-muted-foreground">{investor.email}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCrypto(investor.balance, selectedFund.asset_code)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-mono">
                            {investor.ownership_pct.toFixed(4)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {compositionData.length === 0 && !loadingComp && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No investors found with a balance on this date.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
