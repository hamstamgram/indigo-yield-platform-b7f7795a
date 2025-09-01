import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Shield,
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';

interface AuditLog {
  id: string;
  actor_user: string;
  action: string;
  entity: string;
  entity_id: string;
  old_values: any;
  new_values: any;
  meta: any;
  created_at: string;
  actor?: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

const AdminAudit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [showPII, setShowPII] = useState(false);
  
  // Filters
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Stats
  const [stats, setStats] = useState({
    totalLogs: 0,
    todayLogs: 0,
    uniqueActors: 0,
    mostCommonAction: ''
  });

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAuditLogs();
    }
  }, [isAdmin]);

  useEffect(() => {
    applyFilters();
  }, [logs, actorFilter, actionFilter, entityFilter, dateFromFilter, dateToFilter, searchQuery]);

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
          description: 'Admin privileges required',
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

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('audit_log')
        .select(`
          *,
          actor:profiles!audit_log_actor_user_fkey(email, first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(1000); // Get last 1000 logs

      if (error) throw error;

      setLogs(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch audit logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logsData: AuditLog[]) => {
    const today = new Date().toDateString();
    const todayLogs = logsData.filter(log => 
      new Date(log.created_at).toDateString() === today
    ).length;

    const uniqueActors = new Set(logsData.map(log => log.actor_user)).size;

    const actionCounts = logsData.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonAction = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    setStats({
      totalLogs: logsData.length,
      todayLogs,
      uniqueActors,
      mostCommonAction
    });
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Actor filter
    if (actorFilter) {
      filtered = filtered.filter(log => 
        log.actor?.email?.toLowerCase().includes(actorFilter.toLowerCase()) ||
        `${log.actor?.first_name} ${log.actor?.last_name}`.toLowerCase().includes(actorFilter.toLowerCase())
      );
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Entity filter
    if (entityFilter !== 'all') {
      filtered = filtered.filter(log => log.entity === entityFilter);
    }

    // Date range filter
    if (dateFromFilter) {
      filtered = filtered.filter(log => 
        new Date(log.created_at) >= new Date(dateFromFilter)
      );
    }
    if (dateToFilter) {
      filtered = filtered.filter(log => 
        new Date(log.created_at) <= new Date(dateToFilter + 'T23:59:59')
      );
    }

    // Search query
    if (searchQuery) {
      filtered = filtered.filter(log => 
        JSON.stringify(log).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const exportLogs = () => {
    const csvContent = [
      ['Date', 'Actor', 'Action', 'Entity', 'Entity ID', 'Details'],
      ...filteredLogs.map(log => [
        new Date(log.created_at).toISOString(),
        `${log.actor?.first_name} ${log.actor?.last_name}`,
        log.action,
        log.entity,
        log.entity_id,
        JSON.stringify(log.meta)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString()}.csv`;
    a.click();
  };

  const maskPII = (data: any): any => {
    if (!data) return data;
    if (typeof data === 'string' && data.includes('@')) {
      const [local, domain] = data.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    }
    if (typeof data === 'object') {
      const masked = { ...data };
      Object.keys(masked).forEach(key => {
        if (['email', 'phone', 'ssn', 'tax_id'].includes(key.toLowerCase())) {
          masked[key] = '***MASKED***';
        } else if (typeof masked[key] === 'object') {
          masked[key] = maskPII(masked[key]);
        }
      });
      return masked;
    }
    return data;
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('DEPOSIT')) return 'bg-green-100 text-green-800';
    if (action.includes('DELETE') || action.includes('WITHDRAWAL')) return 'bg-red-100 text-red-800';
    if (action.includes('UPDATE') || action.includes('INTEREST')) return 'bg-blue-100 text-blue-800';
    if (action.includes('STATEMENT')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  // Get unique values for filters
  const uniqueActions = [...new Set(logs.map(log => log.action))];
  const uniqueEntities = [...new Set(logs.map(log => log.entity))];

  if (!isAdmin || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-indigo-600" />
            Audit Log
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Complete audit trail of all administrative actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAuditLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Total Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalLogs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Today's Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.todayLogs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Active Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.uniqueActors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Most Common</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold truncate">{stats.mostCommonAction}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label>Actor</Label>
              <Input
                placeholder="Search by name/email"
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
              />
            </div>
            <div>
              <Label>Action</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Entity</Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {uniqueEntities.map(entity => (
                    <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
              />
            </div>
            <div>
              <Label>Search</Label>
              <Input
                placeholder="Search all fields"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPII(!showPII)}
            >
              {showPII ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showPII ? 'Hide PII' : 'Show PII'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActorFilter('');
                setActionFilter('all');
                setEntityFilter('all');
                setDateFromFilter('');
                setDateToFilter('');
                setSearchQuery('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Entries</CardTitle>
          <CardDescription>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredLogs.length)} of {filteredLogs.length} entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date/Time</th>
                  <th className="text-left p-2">Actor</th>
                  <th className="text-left p-2">Action</th>
                  <th className="text-left p-2">Entity</th>
                  <th className="text-left p-2">Entity ID</th>
                  <th className="text-left p-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2 text-xs">
                      {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                    </td>
                    <td className="p-2">
                      <div>
                        <p className="font-medium">
                          {log.actor?.first_name} {log.actor?.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {showPII ? log.actor?.email : maskPII(log.actor?.email)}
                        </p>
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge className={getActionColor(log.action)} variant="secondary">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-2">{log.entity}</td>
                    <td className="p-2 text-xs font-mono">
                      {log.entity_id?.slice(0, 8)}...
                    </td>
                    <td className="p-2">
                      <details className="cursor-pointer">
                        <summary className="text-xs text-blue-600 hover:underline">
                          View details
                        </summary>
                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                          {log.old_values && (
                            <div className="mb-2">
                              <strong>Old Values:</strong>
                              <pre className="mt-1 overflow-x-auto">
                                {JSON.stringify(showPII ? log.old_values : maskPII(log.old_values), null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.new_values && (
                            <div className="mb-2">
                              <strong>New Values:</strong>
                              <pre className="mt-1 overflow-x-auto">
                                {JSON.stringify(showPII ? log.new_values : maskPII(log.new_values), null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.meta && (
                            <div>
                              <strong>Metadata:</strong>
                              <pre className="mt-1 overflow-x-auto">
                                {JSON.stringify(showPII ? log.meta : maskPII(log.meta), null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          This audit log contains sensitive information. All access is monitored and logged.
          PII is masked by default for security. Exported data should be handled according to data protection policies.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default AdminAudit;
