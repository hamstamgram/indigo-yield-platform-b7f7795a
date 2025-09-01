
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, DollarSign, Users, Zap, Clock, ArrowRight } from "lucide-react";
import { getAdminKPIs, fetchAdminProfile } from "@/services/adminService";
import type { AdminKPIs } from "@/server/admin";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useIsMobile } from "@/hooks/use-mobile";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Handle query parameter redirects (e.g., /admin?tab=yields -> /admin/yield-settings)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    
    if (tab === 'yields') {
      navigate('/admin/yield-settings', { replace: true });
      return;
    }
  }, [location.search, navigate]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch admin profile and KPIs in parallel
        const [profileData, kpiData] = await Promise.all([
          fetchAdminProfile(),
          getAdminKPIs()
        ]);
        
        setUserName(profileData.userName);
        setKpis(kpiData);
      } catch (err) {
        console.error('Error fetching admin dashboard data:', err);
        setError('Failed to load admin dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Display loading state
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Display error if any
  if (error) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          {userName && (
            <p className="text-muted-foreground">Welcome back, {userName}</p>
          )}
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        {userName && (
          <p className="text-muted-foreground">Welcome back, {userName}</p>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.totalAUM || '—'}</div>
            <p className="text-xs text-muted-foreground">
              Assets under management
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.totalInvestors || '—'}</div>
            <p className="text-xs text-muted-foreground">
              Total registered investors
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Interest</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.last24hInterest || '—'}</div>
            <p className="text-xs text-muted-foreground">
              Interest earned today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.pendingWithdrawals || '—'}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Investor Management</CardTitle>
            <CardDescription>
              View and manage investor accounts, KYC status, and portfolios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/admin/investors')} className="w-full">
              Manage Investors
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Yield Settings</CardTitle>
            <CardDescription>
              Configure yield rates and sources for supported assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/admin/yield-settings')} className="w-full">
              Configure Yields
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Management</CardTitle>
            <CardDescription>
              Advanced portfolio operations and bulk management tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/admin-tools')} className="w-full" variant="outline">
              Advanced Tools
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
