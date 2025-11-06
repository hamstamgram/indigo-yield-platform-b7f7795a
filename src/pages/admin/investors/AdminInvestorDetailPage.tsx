import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatAssetValue } from '@/utils/kpiCalculations';
import InvestorMonthlyTracking from '@/components/admin/investors/InvestorMonthlyTracking';
import { 
  User, 
  Mail, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Activity,
  Settings,
  Loader2,
  ArrowLeft
} from 'lucide-react';

interface InvestorDetail {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string | null;
  profile_id: string;
  kyc_status?: string | null;
  aml_status?: string | null;
  phone?: string | null;
}

interface Position {
  id: string;
  asset_code: string;
  current_balance: number;
  principal: number;
  total_earned: number;
  updated_at: string;
}

const AdminInvestorDetailPage = () => {
  const { id } = useParams();
  const [investor, setInvestor] = useState<InvestorDetail | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchInvestorDetails();
    }
  }, [id]);

  useEffect(() => {
    if (investor) {
      fetchPositions();
    }
  }, [investor]);

  const fetchInvestorDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('investors')
        .select('*')
        .eq('id', id || '')
        .maybeSingle();

      if (!data) {
        console.error('Investor not found');
        setIsLoading(false);
        return;
      }

      if (error) throw error;
      setInvestor(data as InvestorDetail);
    } catch (error) {
      console.error('Error fetching investor details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch investor details',
        variant: 'destructive',
      });
    }
  };

  const fetchPositions = async () => {
    try {
      if (!investor?.profile_id) {
        setPositions([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', investor.profile_id);

      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch positions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalAUM = positions.reduce((sum, pos) => sum + pos.current_balance, 0);
  const totalEarned = positions.reduce((sum, pos) => sum + pos.total_earned, 0);
  const totalPrincipal = positions.reduce((sum, pos) => sum + pos.principal, 0);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!investor) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold">Investor Not Found</h2>
              <p className="text-muted-foreground">The requested investor could not be found.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{investor.name}</h1>
            <p className="text-muted-foreground">Investor Profile & Portfolio Management</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={investor.status === 'active' ? 'default' : 'secondary'}>
            {investor.status}
          </Badge>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAUM.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              Total portfolio tokens
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEarned.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              Total tokens earned
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Principal</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPrincipal.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              Principal tokens
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positions</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
            <p className="text-xs text-muted-foreground">
              Active asset positions
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="activity">Monthly Tracking</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Investor profile and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Full Name</p>
                    <p className="text-sm text-muted-foreground">{investor.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email Address</p>
                    <p className="text-sm text-muted-foreground">{investor.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Joined</p>
                    <p className="text-sm text-muted-foreground">
                      {investor.created_at ? new Date(investor.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge variant={investor.status === 'active' ? 'default' : 'secondary'}>
                      {investor.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {investor.kyc_status && (
                <Separator />
              )}
              
              {investor.kyc_status && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium">KYC Status</p>
                    <Badge variant="outline">{investor.kyc_status}</Badge>
                  </div>
                  
                  {investor.aml_status && (
                    <div>
                      <p className="text-sm font-medium">AML Status</p>
                      <Badge variant="outline">{investor.aml_status}</Badge>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Positions</CardTitle>
              <CardDescription>Current portfolio breakdown by asset</CardDescription>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <p className="text-center text-muted-foreground p-8">
                  No positions found for this investor
                </p>
              ) : (
                <div className="space-y-4">
                  {positions.map((position) => (
                    <div key={position.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{position.asset_code}</p>
                        <p className="text-sm text-muted-foreground">
                          Updated: {new Date(position.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatAssetValue(position.current_balance, position.asset_code)} {position.asset_code}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Earned: {formatAssetValue(position.total_earned, position.asset_code)} {position.asset_code}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-4">
          <InvestorMonthlyTracking investorId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminInvestorDetailPage;
