import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AdminDepositForm from '@/components/admin/deposits/AdminDepositForm';
import AdminWithdrawalForm from '@/components/admin/withdrawals/AdminWithdrawalForm';
import InterestCalculationEngine from '@/components/admin/interest/InterestCalculationEngine';
import AdminStatementGenerator from '@/components/admin/statements/AdminStatementGenerator';
import { useInvestors } from '@/hooks/useInvestors';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calculator,
  Shield,
  Activity,
  Users,
  Briefcase,
  FileText
} from 'lucide-react';

const AdminOperations = () => {
  const navigate = useNavigate();
  const { investors, assets, loading, refetch } = useInvestors();
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalInterestPaid: 0,
    activeInvestors: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
    fetchStats();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/dashboard');
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch total deposits
      const { data: deposits } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'DEPOSIT')
        .eq('status', 'confirmed');
      
      const totalDeposits = deposits?.reduce((sum, d) => sum + d.amount, 0) || 0;

      // Fetch total withdrawals
      const { data: withdrawals } = await supabase
        .from('transactions')
        .select('amount')
        .eq('kind', 'withdrawal')
        .in('status', ['confirmed', 'pending']);
      
      const totalWithdrawals = withdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0;

      // Fetch total interest
      const { data: interest } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'INTEREST')
        .eq('status', 'confirmed');
      
      const totalInterestPaid = interest?.reduce((sum, i) => sum + i.amount, 0) || 0;

      // Count active investors (those with portfolios)
      const { count: activeInvestors } = await supabase
        .from('portfolios')
        .select('user_id', { count: 'exact', head: true })
        .gt('balance', 0);

      setStats({
        totalDeposits,
        totalWithdrawals,
        totalInterestPaid,
        activeInvestors: activeInvestors || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-indigo-600" />
          Admin Operations
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage deposits, withdrawals, and interest calculations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">
              Total Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">
                ${stats.totalDeposits.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">
              Total Withdrawals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-2xl font-bold">
                ${stats.totalWithdrawals.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">
              Interest Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">
                ${stats.totalInterestPaid.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">
              Active Investors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-2xl font-bold">
                {stats.activeInvestors}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Notice */}
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <Shield className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <strong>Security Notice:</strong> All operations are logged to the audit trail. 
          Deposits and withdrawals are irreversible once processed. Please double-check all entries.
        </AlertDescription>
      </Alert>

      {/* Operations Tabs */}
      <Tabs defaultValue="deposits" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="deposits" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Deposits
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Withdrawals
          </TabsTrigger>
          <TabsTrigger value="interest" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Interest
          </TabsTrigger>
          <TabsTrigger value="statements" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Statements
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deposits" className="space-y-4">
          <AdminDepositForm 
            investors={investors} 
            assets={assets} 
            onSuccess={() => {
              refetch();
              fetchStats();
            }} 
          />
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          <AdminWithdrawalForm 
            investors={investors} 
            assets={assets} 
            onSuccess={() => {
              refetch();
              fetchStats();
            }} 
          />
        </TabsContent>

        <TabsContent value="interest" className="space-y-4">
          <InterestCalculationEngine 
            onSuccess={() => {
              refetch();
              fetchStats();
            }} 
          />
        </TabsContent>

        <TabsContent value="statements" className="space-y-4">
          <AdminStatementGenerator 
            investors={investors} 
            onSuccess={() => {
              refetch();
              fetchStats();
            }} 
          />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <AuditLogViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Audit Log Viewer Component
const AuditLogViewer = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select(`
          *,
          actor:profiles!audit_log_actor_user_fkey(email, first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Audit Log</CardTitle>
        <CardDescription>
          Last 50 financial operations performed by administrators
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Admin</th>
                <th className="text-left p-2">Action</th>
                <th className="text-left p-2">Entity</th>
                <th className="text-left p-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="p-2 text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-2">
                    {log.actor?.first_name} {log.actor?.last_name}
                  </td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      log.action === 'CREATE_DEPOSIT' ? 'bg-green-100 text-green-800' :
                      log.action === 'CREATE_WITHDRAWAL' ? 'bg-red-100 text-red-800' :
                      log.action === 'APPLY_INTEREST' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-2">{log.entity}</td>
                  <td className="p-2 text-xs text-gray-600 dark:text-gray-400">
                    {log.meta && (
                      <details>
                        <summary className="cursor-pointer">View details</summary>
                        <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.meta, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminOperations;
