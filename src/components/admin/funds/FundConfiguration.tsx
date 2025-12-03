import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Settings, Percent, Calendar, Save, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listFunds,
  getFund,
  updateFund,
  createFund,
  type Fund,
} from "@/services/admin/fundService";

interface FeeHistory {
  id: string;
  effective_from: string;
  mgmt_fee_bps: number;
  perf_fee_bps: number;
  created_by: string;
  created_at: string;
}

const FundConfiguration = () => {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFund, setSelectedFund] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [fundData, setFundData] = useState<Partial<Fund>>({
    name: "",
    code: "",
    asset: "BTC",
    fund_class: "default",
    status: "active",
    mgmt_fee_bps: 200,
    perf_fee_bps: 2000,
    min_investment: 1000,
    lock_period_days: 0,
    high_water_mark: 0,
    inception_date: new Date().toISOString().split("T")[0],
  });
  const [feeHistory] = useState<FeeHistory[]>([]);
  const { toast } = useToast();

  const loadFunds = useCallback(async () => {
    try {
      const fundsData = await listFunds();
      setFunds(fundsData);
      if (fundsData.length > 0 && !selectedFund) {
        setSelectedFund(fundsData[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error loading funds",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedFund, toast]);

  const loadFundData = useCallback(
    async (fundId: string) => {
      try {
        const fund = await getFund(fundId);
        setFundData(fund);
      } catch (error: any) {
        toast({
          title: "Error loading fund data",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  useEffect(() => {
    loadFunds();
  }, [loadFunds]);

  useEffect(() => {
    if (selectedFund && !isCreating) {
      loadFundData(selectedFund);
    }
  }, [selectedFund, isCreating, loadFundData]);

  const handleSave = async () => {
    if (!fundData.name || !fundData.code) {
      toast({
        title: "Validation Error",
        description: "Fund name and code are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      if (isCreating) {
        const newFund = await createFund(
          fundData as Omit<Fund, "id" | "created_at" | "updated_at">
        );
        setFunds([newFund, ...funds]);
        setSelectedFund(newFund.id);
        setIsCreating(false);
        toast({
          title: "Success",
          description: "Fund created successfully",
        });
      } else {
        const updatedFund = await updateFund(selectedFund, fundData);
        setFunds(funds.map((f) => (f.id === selectedFund ? updatedFund : f)));
        toast({
          title: "Success",
          description: "Fund configuration updated successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error saving fund",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setFundData({
      name: "",
      code: "",
      asset: "BTC",
      fund_class: "default",
      status: "active",
      mgmt_fee_bps: 200,
      perf_fee_bps: 2000,
      min_investment: 1000,
      lock_period_days: 0,
      high_water_mark: 0,
      inception_date: new Date().toISOString().split("T")[0],
    });
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    if (funds.length > 0) {
      setSelectedFund(funds[0].id);
      loadFundData(funds[0].id);
    }
  };

  const updateField = (field: keyof Fund, value: any) => {
    setFundData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Fund Configuration</h2>
          <p className="text-muted-foreground">Manage fund settings, fees, and parameters</p>
        </div>
        <div className="flex gap-2">
          {isCreating ? (
            <>
              <Button variant="outline" onClick={handleCancelCreate}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Create Fund
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                New Fund
              </Button>
              <Button onClick={handleSave} disabled={saving || !selectedFund}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {!isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Fund Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedFund} onValueChange={setSelectedFund}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a fund to configure" />
              </SelectTrigger>
              <SelectContent>
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    <div className="flex items-center gap-2">
                      <span>
                        {fund.code} - {fund.name}
                      </span>
                      <Badge variant={fund.status === "active" ? "default" : "secondary"}>
                        {fund.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="fees">Fees & Terms</TabsTrigger>
          <TabsTrigger value="history">Change History</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fund Information</CardTitle>
              <CardDescription>Basic fund identification and classification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Fund Name *</Label>
                  <Input
                    id="name"
                    value={fundData.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g., Indigo Bitcoin Fund"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Fund Code *</Label>
                  <Input
                    id="code"
                    value={fundData.code || ""}
                    onChange={(e) => updateField("code", e.target.value.toUpperCase())}
                    placeholder="e.g., IBF"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="asset">Primary Asset</Label>
                  <Select
                    value={fundData.asset || "BTC"}
                    onValueChange={(value) => updateField("asset", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                      <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                      <SelectItem value="SOL">Solana (SOL)</SelectItem>
                      <SelectItem value="USDT">Stablecoin (USDT)</SelectItem>
                      <SelectItem value="XRP">XRP (XRP)</SelectItem>
                      <SelectItem value="XAUT">Tether Gold (XAUT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fund_class">Fund Class</Label>
                  <Select
                    value={fundData.fund_class || "default"}
                    onValueChange={(value) => updateField("fund_class", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Class</SelectItem>
                      <SelectItem value="institutional">Institutional</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="accredited">Accredited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inception_date">Inception Date</Label>
                  <Input
                    id="inception_date"
                    type="date"
                    value={fundData.inception_date || ""}
                    onChange={(e) => updateField("inception_date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Fund Status</Label>
                  <Select
                    value={fundData.status || "active"}
                    onValueChange={(value) => updateField("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Investment Terms
              </CardTitle>
              <CardDescription>Fund-level investment parameters and constraints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  ℹ️ Fee Management Update
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Fee management has been moved to individual investor profiles. Each investor can
                  now have personalized fee structures managed from their individual detail pages.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_investment">Minimum Investment</Label>
                  <Input
                    id="min_investment"
                    type="number"
                    value={fundData.min_investment || 1000}
                    onChange={(e) => updateField("min_investment", parseFloat(e.target.value) || 0)}
                    min="0"
                    step="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lock_period">Lock Period (days)</Label>
                  <Input
                    id="lock_period"
                    type="number"
                    value={fundData.lock_period_days || 0}
                    onChange={(e) => updateField("lock_period_days", parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="high_water_mark">High Water Mark</Label>
                <Input
                  id="high_water_mark"
                  type="number"
                  value={fundData.high_water_mark || 0}
                  onChange={(e) => updateField("high_water_mark", parseFloat(e.target.value) || 0)}
                  step="0.01"
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Performance threshold for fund tracking
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fee Change History</CardTitle>
              <CardDescription>Historical record of fee structure changes</CardDescription>
            </CardHeader>
            <CardContent>
              {feeHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Effective Date</TableHead>
                      <TableHead>Management Fee</TableHead>
                      <TableHead>Performance Fee</TableHead>
                      <TableHead>Changed By</TableHead>
                      <TableHead>Date Changed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {new Date(record.effective_from).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{(record.mgmt_fee_bps / 100).toFixed(2)}%</TableCell>
                        <TableCell>{(record.perf_fee_bps / 100).toFixed(2)}%</TableCell>
                        <TableCell>{record.created_by}</TableCell>
                        <TableCell>{new Date(record.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No fee changes recorded yet</p>
                  <p className="text-sm">Fee structure changes will appear here when made</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FundConfiguration;
