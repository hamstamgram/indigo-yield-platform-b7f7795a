import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AdminOnly } from '@/components/ui/RoleGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { redactForAdmin } from '@/lib/security/redact-pii';
import { useCSVExport } from '@/lib/export';
import { 
  Shield, 
  Search, 
  Calendar, 
  Filter, 
  Download, 
  RefreshCw, 
  Eye,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  DollarSign,
  Settings,
  Users
} from 'lucide-react';

interface AuditEvent {
  event_id: string;
  source_table: string;
  user_id: string | null;
  operation: string;
  entity: string;
  entity_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  meta: Record<string, any> | null;
  created_at: string;
  actor_user: string | null;
  actor_name?: string;
  affected_user_email?: string;
}

interface AuditFilters {
  operation: string;
  entity: string;
  actor_user: string;
  date_from: string;
  date_to: string;
  search_query: string;
}

const OPERATION_TYPES = [
  'login', 'logout', '2fa_setup', '2fa_verify', 'session_revoked', 'password_change',
  'balance_adjustment', 'support_ticket_update', 'yield_setting_create', 
  'fee_configuration_update', 'CREATE_INVESTOR_ACCOUNT', 'UPDATE_INVESTOR_STATUS',
  'UPDATE_FUND_FEES', 'CREATE_YIELD_SETTING', 'CREATE_BALANCE_ADJUSTMENT'
];

const ENTITY_TYPES = [
  'auth', 'balance', 'support_ticket', 'yield_settings', 'fund_fees', 
  'profiles', 'fund_configurations', 'balance_adjustments'
];

export function AuditDrilldown() {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AuditEvent[]>([]);
  const [filters, setFilters] = useState<AuditFilters>({
    operation: 'all',
    entity: 'all',
    actor_user: 'all',
    date_from: '',
    date_to: '',
    search_query: '',
  });
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [adminUsers, setAdminUsers] = useState<{id: string, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalEvents, setTotalEvents] = useState(0);
  const { exportAuditLog } = useCSVExport();

  useEffect(() => {
    loadAuditEvents();
    loadAdminUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [auditEvents, filters]);

  const loadAuditEvents = async () => {
    try {
      setIsLoading(true);
      
      // Load from our consolidated audit view with enhanced data
      const { data, error, count } = await supabase
        .from('audit_events_v')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(1000); // Limit for performance

      if (error) throw error;

      // Enhance events with admin names and affected user emails
      const enhancedEvents = await Promise.all(
        (data || []).map(async (event) => {
          const enhanced: AuditEvent = { ...event };

          // Get actor name
          if (event.actor_user) {
            try {
              const { data: actorData } = await supabase.rpc('get_admin_name', {
                admin_id: event.actor_user
              });
              enhanced.actor_name = actorData || 'Unknown';
            } catch (error) {
              console.warn('Failed to get actor name:', error);
            }
          }

          // Get affected user email if applicable
          if (event.user_id) {
            try {
              const { data: userData } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', event.user_id)
                .single();
              
              enhanced.affected_user_email = userData?.email;
            } catch (error) {
              // Ignore if user not found
            }
          }

          return enhanced;
        })
      );

      setAuditEvents(enhancedEvents);
      setTotalEvents(count || 0);
    } catch (error) {
      console.error('Error loading audit events:', error);
      toast.error('Failed to load audit events');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('is_admin', true)
        .order('first_name');

      if (error) throw error;

      const admins = (data || []).map(admin => ({
        id: admin.id,
        name: `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Unknown'
      }));

      setAdminUsers(admins);
    } catch (error) {
      console.error('Error loading admin users:', error);
    }
  };

  const applyFilters = () => {
    let filtered = auditEvents;

    // Apply operation filter
    if (filters.operation !== 'all') {
      filtered = filtered.filter(event => event.operation === filters.operation);
    }

    // Apply entity filter
    if (filters.entity !== 'all') {
      filtered = filtered.filter(event => event.entity === filters.entity);
    }

    // Apply actor filter
    if (filters.actor_user !== 'all') {
      filtered = filtered.filter(event => event.actor_user === filters.actor_user);
    }

    // Apply date filters
    if (filters.date_from) {
      const fromDate = new Date(filters.date_from);
      filtered = filtered.filter(event => new Date(event.created_at) >= fromDate);
    }

    if (filters.date_to) {
      const toDate = new Date(filters.date_to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(event => new Date(event.created_at) <= toDate);
    }

    // Apply search query
    if (filters.search_query.trim()) {
      const query = filters.search_query.toLowerCase();
      filtered = filtered.filter(event => 
        event.operation.toLowerCase().includes(query) ||
        event.entity.toLowerCase().includes(query) ||
        event.actor_name?.toLowerCase().includes(query) ||
        event.affected_user_email?.toLowerCase().includes(query) ||
        JSON.stringify(event.meta || {}).toLowerCase().includes(query) ||
        JSON.stringify(event.new_values || {}).toLowerCase().includes(query)
      );
    }

    setFilteredEvents(filtered);
  };

  const updateFilter = (key: keyof AuditFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      operation: 'all',
      entity: 'all',
      actor_user: 'all',
      date_from: '',
      date_to: '',
      search_query: '',
    });
  };

  const getOperationIcon = (operation: string) => {
    if (operation.includes('login') || operation.includes('auth')) return <User className="h-4 w-4" />;
    if (operation.includes('balance') || operation.includes('adjustment')) return <DollarSign className="h-4 w-4" />;
    if (operation.includes('yield') || operation.includes('fee')) return <Settings className="h-4 w-4" />;
    if (operation.includes('ticket') || operation.includes('support')) return <FileText className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getOperationBadge = (operation: string) => {
    if (operation.includes('login') || operation.includes('2fa')) {
      return <Badge variant="default" className="flex items-center gap-1">
        {getOperationIcon(operation)}
        {operation.replace('_', ' ').toUpperCase()}
      </Badge>;
    }
    if (operation.includes('balance') || operation.includes('adjustment')) {
      return <Badge variant="secondary" className="flex items-center gap-1">
        {getOperationIcon(operation)}
        {operation.replace('_', ' ').toUpperCase()}
      </Badge>;
    }
    return <Badge variant="outline" className="flex items-center gap-1">
      {getOperationIcon(operation)}
      {operation.replace('_', ' ').toUpperCase()}
    </Badge>;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const showEventDetails = (event: AuditEvent) => {
    setSelectedEvent(event);
    setShowDetailsDialog(true);
  };

  const exportToCSV = async () => {
    if (filteredEvents.length === 0) {
      toast.error('No audit events to export');
      return;
    }

    // Transform audit events for export
    const exportData = filteredEvents.map(event => ({
      timestamp: formatDateTime(event.created_at),
      user: redactForAdmin(event.actor_name || 'System'),
      operation: event.operation,
      target_table: event.source_table,
      target_id: event.entity_id || '',
      ip_address: event.meta?.ip_address || '',
      user_agent: event.meta?.user_agent ? event.meta.user_agent.substring(0, 100) : '',
      success: event.meta?.success !== false ? 'Yes' : 'No',
      entity: event.entity,
      event_id: event.event_id,
      affected_user: redactForAdmin(event.affected_user_email || ''),
      old_values: event.old_values ? JSON.stringify(event.old_values) : '',
      new_values: event.new_values ? JSON.stringify(event.new_values) : '',
    }));

    const result = await exportAuditLog(exportData);
    
    if (result.success) {
      toast.success(`Audit log exported successfully (${result.rowCount} events)`);
    } else {
      toast.error(result.error || 'Failed to export audit log');
    }
  };

  return (
    <AdminOnly>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Comprehensive Audit Trail
          </h1>
          <p className="text-muted-foreground mt-2">
            Consolidated view of all platform activities with filtering and export capabilities.
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Audit Filters
            </CardTitle>
            <CardDescription>
              Filter audit events by operation, entity, user, date range, or search query.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Operation Type</Label>
                <Select 
                  value={filters.operation} 
                  onValueChange={(value) => updateFilter('operation', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Operations</SelectItem>
                    {OPERATION_TYPES.map(op => (
                      <SelectItem key={op} value={op}>{op.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select 
                  value={filters.entity} 
                  onValueChange={(value) => updateFilter('entity', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    {ENTITY_TYPES.map(entity => (
                      <SelectItem key={entity} value={entity}>{entity.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Admin User</Label>
                <Select 
                  value={filters.actor_user} 
                  onValueChange={(value) => updateFilter('actor_user', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Admins</SelectItem>
                    {adminUsers.map(admin => (
                      <SelectItem key={admin.id} value={admin.id}>{admin.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Input
                    placeholder="Search events..."
                    value={filters.search_query}
                    onChange={(e) => updateFilter('search_query', e.target.value)}
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => updateFilter('date_from', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => updateFilter('date_to', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {filteredEvents.length} of {totalEvents} total events
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button variant="outline" onClick={loadAuditEvents} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  variant="outline" 
                  onClick={exportToCSV}
                  disabled={filteredEvents.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Events</CardTitle>
            <CardDescription>
              Comprehensive audit trail of all platform activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading audit events...</span>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {auditEvents.length === 0 ? 'No audit events found' : 'No events match the current filters'}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Affected User</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow key={event.event_id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateTime(event.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getOperationBadge(event.operation)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{event.entity}</Badge>
                        </TableCell>
                        <TableCell>
                          {event.actor_name ? redactForAdmin(event.actor_name) : 'System'}
                        </TableCell>
                        <TableCell>
                          {event.affected_user_email ? redactForAdmin(event.affected_user_email) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {event.source_table}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => showEventDetails(event)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Audit Event Details
              </DialogTitle>
              <DialogDescription>
                Detailed information about the audit event including metadata and data changes.
              </DialogDescription>
            </DialogHeader>

            {selectedEvent && (
              <div className="space-y-6">
                {/* Event Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <Label>Event ID</Label>
                      <p className="text-sm font-mono">{selectedEvent.event_id}</p>
                    </div>
                    <div>
                      <Label>Operation</Label>
                      <div className="mt-1">
                        {getOperationBadge(selectedEvent.operation)}
                      </div>
                    </div>
                    <div>
                      <Label>Entity</Label>
                      <p className="text-sm">{selectedEvent.entity}</p>
                    </div>
                    <div>
                      <Label>Source Table</Label>
                      <p className="text-sm font-mono">{selectedEvent.source_table}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label>Date/Time</Label>
                      <p className="text-sm">{formatDateTime(selectedEvent.created_at)}</p>
                    </div>
                    <div>
                      <Label>Actor</Label>
                      <p className="text-sm">{selectedEvent.actor_name ? redactForAdmin(selectedEvent.actor_name) : 'System'}</p>
                    </div>
                    <div>
                      <Label>Affected User</Label>
                      <p className="text-sm">{selectedEvent.affected_user_email ? redactForAdmin(selectedEvent.affected_user_email) : 'N/A'}</p>
                    </div>
                    <div>
                      <Label>Entity ID</Label>
                      <p className="text-sm font-mono">{selectedEvent.entity_id || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Data Changes */}
                {selectedEvent.old_values && (
                  <div>
                    <Label>Previous Values</Label>
                    <pre className="mt-2 p-3 bg-gray-50 rounded border text-xs overflow-x-auto">
                      {JSON.stringify(selectedEvent.old_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedEvent.new_values && (
                  <div>
                    <Label>New Values</Label>
                    <pre className="mt-2 p-3 bg-gray-50 rounded border text-xs overflow-x-auto">
                      {JSON.stringify(selectedEvent.new_values, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Metadata */}
                {selectedEvent.meta && Object.keys(selectedEvent.meta).length > 0 && (
                  <div>
                    <Label>Metadata</Label>
                    <pre className="mt-2 p-3 bg-blue-50 rounded border text-xs overflow-x-auto">
                      {JSON.stringify(selectedEvent.meta, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminOnly>
  );
}
