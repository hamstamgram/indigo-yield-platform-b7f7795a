import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Filter, Calendar, User, Activity, Database, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { auditLogService, AuditLogEntry, AuditLogFilters } from '@/services/auditLogService';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

const AuditLogViewer = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [entities, setEntities] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const [filters, setFilters] = useState<AuditLogFilters>({
    limit: 50,
    offset: 0
  });

  const [stats, setStats] = useState({
    totalEntries: 0,
    actionCounts: {} as Record<string, number>,
    entityCounts: {} as Record<string, number>,
    topActors: [] as Array<{ user_id: string; name: string; count: number }>
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [logsResult, entitiesData, actionsData, summaryData] = await Promise.all([
        auditLogService.fetchAuditLogs(filters),
        auditLogService.getUniqueEntities(),
        auditLogService.getUniqueActions(),
        auditLogService.getAuditLogSummary({
          startDate: filters.startDate,
          endDate: filters.endDate
        })
      ]);

      setLogs(logsResult.data);
      setTotalCount(logsResult.count);
      setEntities(entitiesData);
      setActions(actionsData);
      setStats(summaryData);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time subscription
  useRealtimeSubscription({
    table: 'audit_log',
    event: '*',
    onUpdate: loadData
  });

  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
      offset: 0 // Reset pagination
    }));
  };

  const handlePageChange = (direction: 'next' | 'prev') => {
    setFilters(prev => ({
      ...prev,
      offset: direction === 'next' 
        ? (prev.offset || 0) + (prev.limit || 50)
        : Math.max(0, (prev.offset || 0) - (prev.limit || 50))
    }));
  };

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action.toUpperCase()) {
      case 'CREATE':
      case 'INSERT':
        return 'default';
      case 'UPDATE':
      case 'EDIT':
        return 'secondary';
      case 'DELETE':
      case 'REMOVE':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground">
          Complete audit trail of all system changes and administrative actions
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEntries.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Audit entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entity Types</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.entityCounts).length}</div>
            <p className="text-xs text-muted-foreground">Different entities tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Types</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.actionCounts).length}</div>
            <p className="text-xs text-muted-foreground">Different action types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Actor</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold">{stats.topActors[0]?.name || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {stats.topActors[0]?.count || 0} actions
            </p>
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
          <CardDescription>Filter audit logs by entity, action, date, or user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={filters.entity || 'all'}
              onValueChange={(value) => handleFilterChange('entity', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entities.map(entity => (
                  <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.action || 'all'}
              onValueChange={(value) => handleFilterChange('action', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                placeholder="Start Date"
              />
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                placeholder="End Date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Entries ({totalCount.toLocaleString()})</CardTitle>
          <CardDescription>Detailed log of all system changes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <>
                  <TableRow 
                    key={log.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                  >
                    <TableCell className="font-mono text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>

                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{log.actor_name || 'System'}</div>
                        {log.actor_email && (
                          <div className="text-xs text-muted-foreground">{log.actor_email}</div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {log.entity}
                      </Badge>
                    </TableCell>

                    <TableCell className="font-mono text-xs">
                      {log.entity_id ? log.entity_id.substring(0, 8) + '...' : 'N/A'}
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRow(expandedRow === log.id ? null : log.id);
                        }}
                      >
                        {expandedRow === log.id ? 'Hide' : 'Show'} Details
                      </Button>
                    </TableCell>
                  </TableRow>

                  {expandedRow === log.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30">
                        <div className="p-4 space-y-2">
                          <div>
                            <span className="font-semibold">Changes:</span>
                            <p className="text-sm mt-1">
                              {auditLogService.formatChanges(log.old_values, log.new_values)}
                            </p>
                          </div>
                          
                          {log.meta && Object.keys(log.meta).length > 0 && (
                            <div>
                              <span className="font-semibold">Metadata:</span>
                              <pre className="text-xs mt-1 p-2 bg-background rounded overflow-auto">
                                {JSON.stringify(log.meta, null, 2)}
                              </pre>
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground">
                            Full Entity ID: {log.entity_id || 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>

          {logs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No audit log entries found matching your filters
            </div>
          )}

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {(filters.offset || 0) + 1} to {Math.min((filters.offset || 0) + logs.length, totalCount)} of {totalCount}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange('prev')}
                disabled={(filters.offset || 0) === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange('next')}
                disabled={(filters.offset || 0) + (filters.limit || 50) >= totalCount}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogViewer;
