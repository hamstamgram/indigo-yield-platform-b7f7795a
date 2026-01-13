/**
 * Debug Functions Page
 * Admin page for testing database functions
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Database,
  RefreshCw,
  AlertTriangle,
  Loader2
} from "lucide-react";
import {
  testAllFunctions,
  reconcileFundPeriod,
  reconcileInvestorPosition,
  getVoidYieldImpact,
  FunctionTestResult,
} from "@/services/admin/reconciliationService";
import { useAuth } from "@/services/auth";

// Default test data (from our audit)
const DEFAULT_TEST_DATA = {
  btcFundId: "0a048d9b-c4cf-46eb-b428-59e10307df93",
  ethFundId: "717614a2-9e24-4abc-a89d-02209a3a772a",
  testInvestorId: "daba0cd4-fff3-4698-8ee7-e14cc5f31468",
  btcDistributionId: "3be4ea3c-1449-4577-90e6-a6df33ff0008",
  ethDistributionId: "1825127c-3d2b-4582-941c-8d6bc822cfe4",
  startDate: "2026-01-01",
  endDate: "2026-01-13",
};

export default function DebugFunctionsPage() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<FunctionTestResult[]>([]);
  
  // Individual test states
  const [fundId, setFundId] = useState(DEFAULT_TEST_DATA.btcFundId);
  const [investorId, setInvestorId] = useState(DEFAULT_TEST_DATA.testInvestorId);
  const [distributionId, setDistributionId] = useState(DEFAULT_TEST_DATA.btcDistributionId);
  const [startDate, setStartDate] = useState(DEFAULT_TEST_DATA.startDate);
  const [endDate, setEndDate] = useState(DEFAULT_TEST_DATA.endDate);
  
  const [individualResult, setIndividualResult] = useState<unknown>(null);
  const [individualLoading, setIndividualLoading] = useState<string | null>(null);

  const runAllTests = async () => {
    if (!user?.id) {
      toast.error("Must be logged in as admin");
      return;
    }
    
    setIsRunning(true);
    setResults([]);
    
    try {
      const testResults = await testAllFunctions({
        fundId,
        investorId,
        distributionId,
        adminId: user.id,
        startDate,
        endDate,
      });
      
      setResults(testResults);
      
      const passed = testResults.filter(r => r.success).length;
      const failed = testResults.filter(r => !r.success).length;
      
      if (failed === 0) {
        toast.success(`All ${passed} tests passed!`);
      } else {
        toast.warning(`${passed} passed, ${failed} failed`);
      }
    } catch (error) {
      toast.error(`Test suite failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runIndividualTest = async (testName: string) => {
    if (!user?.id) {
      toast.error("Must be logged in as admin");
      return;
    }
    
    setIndividualLoading(testName);
    setIndividualResult(null);
    
    try {
      let result: unknown;
      
      switch (testName) {
        case "reconcile_fund_period":
          result = await reconcileFundPeriod(fundId, startDate, endDate);
          break;
        case "reconcile_investor_position":
          result = await reconcileInvestorPosition(investorId, fundId, user.id, "check");
          break;
        case "get_void_yield_impact":
          result = await getVoidYieldImpact(distributionId);
          break;
        default:
          throw new Error(`Unknown test: ${testName}`);
      }
      
      setIndividualResult(result);
      toast.success(`${testName} executed successfully`);
    } catch (error) {
      setIndividualResult({ error: error instanceof Error ? error.message : String(error) });
      toast.error(`${testName} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIndividualLoading(null);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Database Function Tests</h1>
          <p className="text-muted-foreground">
            Test and validate all fixed database functions
          </p>
        </div>
        <Button 
          onClick={runAllTests} 
          disabled={isRunning}
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run All Tests
            </>
          )}
        </Button>
      </div>

      {/* Test Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Test Parameters
          </CardTitle>
          <CardDescription>
            Configure the test data for function execution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fundId">Fund ID</Label>
              <Input
                id="fundId"
                value={fundId}
                onChange={(e) => setFundId(e.target.value)}
                placeholder="UUID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="investorId">Investor ID</Label>
              <Input
                id="investorId"
                value={investorId}
                onChange={(e) => setInvestorId(e.target.value)}
                placeholder="UUID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="distributionId">Distribution ID</Label>
              <Input
                id="distributionId"
                value={distributionId}
                onChange={(e) => setDistributionId(e.target.value)}
                placeholder="UUID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFundId(DEFAULT_TEST_DATA.btcFundId);
                  setInvestorId(DEFAULT_TEST_DATA.testInvestorId);
                  setDistributionId(DEFAULT_TEST_DATA.btcDistributionId);
                  setStartDate(DEFAULT_TEST_DATA.startDate);
                  setEndDate(DEFAULT_TEST_DATA.endDate);
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset to Defaults
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Function Tests */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* reconcile_fund_period */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">reconcile_fund_period</CardTitle>
            <CardDescription className="text-xs">
              Check fund metrics for a date range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => runIndividualTest("reconcile_fund_period")}
              disabled={individualLoading !== null}
            >
              {individualLoading === "reconcile_fund_period" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Test Function
            </Button>
          </CardContent>
        </Card>

        {/* reconcile_investor_position */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">reconcile_investor_position</CardTitle>
            <CardDescription className="text-xs">
              Validate investor position calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => runIndividualTest("reconcile_investor_position")}
              disabled={individualLoading !== null}
            >
              {individualLoading === "reconcile_investor_position" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Test Function
            </Button>
          </CardContent>
        </Card>

        {/* get_void_yield_impact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">get_void_yield_impact</CardTitle>
            <CardDescription className="text-xs">
              Preview impact of voiding a yield distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => runIndividualTest("get_void_yield_impact")}
              disabled={individualLoading !== null}
            >
              {individualLoading === "get_void_yield_impact" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Test Function
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Results Summary */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Test Results Summary
              <Badge variant={results.every(r => r.success) ? "default" : "destructive"}>
                {results.filter(r => r.success).length}/{results.length} Passed
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success 
                      ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30" 
                      : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-mono font-medium">{result.functionName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {result.executionTime.toFixed(0)}ms
                    </div>
                  </div>
                  
                  {result.error && (
                    <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{result.error}</span>
                    </div>
                  )}
                  
                  {result.success && result.result && (
                    <details className="mt-2">
                      <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                        View Result Data
                      </summary>
                      <ScrollArea className="h-40 mt-2">
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                          {JSON.stringify(result.result, null, 2)}
                        </pre>
                      </ScrollArea>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Result Display */}
      {individualResult && (
        <Card>
          <CardHeader>
            <CardTitle>Individual Test Result</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                {JSON.stringify(individualResult, null, 2)}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Quick Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Reference: Test Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Funds</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><span className="font-mono">BTC:</span> {DEFAULT_TEST_DATA.btcFundId}</li>
                <li><span className="font-mono">ETH:</span> {DEFAULT_TEST_DATA.ethFundId}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Yield Distributions</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><span className="font-mono">BTC:</span> {DEFAULT_TEST_DATA.btcDistributionId}</li>
                <li><span className="font-mono">ETH:</span> {DEFAULT_TEST_DATA.ethDistributionId}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
