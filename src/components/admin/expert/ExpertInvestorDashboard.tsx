import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  TrendingUp,
  Settings,
  Loader2,
  Save,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { expertInvestorService, ExpertInvestorSummary } from "@/services/expertInvestorService";
import { formatAssetValue } from "@/utils/kpiCalculations";
import ExpertPositionsTable from "./ExpertPositionsTable";
import InvestorFeeManager from "./InvestorFeeManager";

const ExpertInvestorDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ExpertInvestorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    feePercentage: 0,
  });

  useEffect(() => {
    if (id) {
      fetchInvestorData();
    }
  }, [id]);

  const fetchInvestorData = async () => {
    try {
      setLoading(true);
      const investorData = await expertInvestorService.getInvestorExpertView(id!);
      setData(investorData);
      setEditValues({
        feePercentage: investorData.investor.feePercentage * 100, // Convert to percentage for display
      });
    } catch (error) {
      console.error("Error fetching investor data:", error);
      toast.error("Failed to load investor data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFeePercentage = async () => {
    try {
      await expertInvestorService.updateInvestorFeePercentage(
        id!,
        editValues.feePercentage / 100 // Convert back to decimal
      );
      setEditing(false);
      fetchInvestorData();
      toast.success("Fee percentage updated successfully");
    } catch (error) {
      console.error("Error updating fee percentage:", error);
      toast.error("Failed to update fee percentage");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Investor Not Found</h2>
        <Button onClick={() => navigate("/admin/investors")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Investors
        </Button>
      </div>
    );
  }

  const { investor, positions, performance, fees } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate("/admin/investors")} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {investor.firstName} {investor.lastName}
            </h1>
            <p className="text-muted-foreground">{investor.email}</p>
          </div>
        </div>
        <Badge variant={investor.status === "active" ? "default" : "secondary"}>
          {investor.status}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAssetValue(investor.totalAum)}</div>
            <p className="text-xs text-muted-foreground">
              +{formatAssetValue(investor.totalEarnings)} earned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Return</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.totalReturnPercent.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              {formatAssetValue(performance.totalReturn)} absolute
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee Rate</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {editing ? (
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={editValues.feePercentage}
                    onChange={(e) =>
                      setEditValues({
                        ...editValues,
                        feePercentage: Number(e.target.value),
                      })
                    }
                    className="w-20 h-8"
                  />
                  <span className="text-sm">%</span>
                  <Button size="sm" onClick={handleSaveFeePercentage}>
                    <Save className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold">
                    {(investor.feePercentage * 100).toFixed(2)}%
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatAssetValue(fees.totalFeesCollected)} collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positions</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{investor.positionCount}</div>
            <p className="text-xs text-muted-foreground">
              Last activity: {new Date(investor.lastActivityDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="positions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="fees">Fee Management</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="mt-6">
          <ExpertPositionsTable positions={positions} onPositionUpdate={fetchInvestorData} />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
              <CardDescription>Investor returns across all positions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <span className="text-sm font-medium">Total Return:</span>
                    <div className="text-right">
                      <div className="font-semibold">
                        {performance.totalReturnPercent.toFixed(2)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ⚠️ Need per-asset breakdown
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <span className="text-sm font-medium">Monthly Return:</span>
                    <div className="text-right">
                      <div className="font-semibold">{performance.monthlyReturn.toFixed(2)}%</div>
                      <div className="text-xs text-muted-foreground">Average</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <span className="text-sm font-medium">YTD Return:</span>
                    <div className="text-right">
                      <div className="font-semibold">
                        {performance.yearToDateReturn.toFixed(2)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date().getFullYear()}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <span className="text-sm font-medium">Inception Return:</span>
                    <div className="text-right">
                      <div className="font-semibold">{performance.inceptionReturn.toFixed(2)}%</div>
                      <div className="text-xs text-muted-foreground">Since start</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="mt-6">
          <InvestorFeeManager investor={investor} fees={fees} onUpdate={fetchInvestorData} />
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Investor Profile</CardTitle>
              <CardDescription>Personal information and compliance status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-sm font-medium">Full Name</Label>
                      <p className="text-sm">
                        {investor.firstName} {investor.lastName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm">{investor.email}</p>
                    </div>
                  </div>

                  {investor.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label className="text-sm font-medium">Phone</Label>
                        <p className="text-sm">{investor.phone}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-sm font-medium">Onboarding Date</Label>
                      <p className="text-sm">
                        {new Date(investor.onboardingDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">KYC Status</Label>
                    <div className="mt-1">
                      <Badge variant={investor.kycStatus === "approved" ? "default" : "secondary"}>
                        {investor.kycStatus}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">AML Status</Label>
                    <div className="mt-1">
                      <Badge variant={investor.amlStatus === "approved" ? "default" : "secondary"}>
                        {investor.amlStatus}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Account Status</Label>
                    <div className="mt-1">
                      <Badge variant={investor.status === "active" ? "default" : "secondary"}>
                        {investor.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExpertInvestorDashboard;
