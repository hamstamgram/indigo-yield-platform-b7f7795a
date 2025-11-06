import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminServiceV2 } from '@/services/adminServiceV2';

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'account' | 'transaction' | 'general';
  investor_id: string;
  investor_name: string;
  investor_email: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  resolution_notes?: string;
}

const AdminSupportQueue = () => {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [_investors, setInvestors] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  // Mock support tickets for demonstration
  const mockTickets: SupportTicket[] = [
    {
      id: '1',
      title: 'Unable to access portfolio dashboard',
      description: 'I keep getting an error when trying to view my portfolio. The page loads but shows no data.',
      status: 'open',
      priority: 'high',
      category: 'technical',
      investor_id: '1',
      investor_name: 'John Doe',
      investor_email: 'john@example.com',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      title: 'Withdrawal request status inquiry',
      description: 'My withdrawal request from last week is still showing as pending. Can you provide an update?',
      status: 'in-progress',
      priority: 'medium',
      category: 'transaction',
      investor_id: '2',
      investor_name: 'Jane Smith',
      investor_email: 'jane@example.com',
      created_at: '2024-01-14T14:20:00Z',
      updated_at: '2024-01-15T09:15:00Z',
      assigned_to: 'Admin User',
    },
    {
      id: '3',
      title: 'Account verification documents',
      description: 'I uploaded my KYC documents but the status still shows as pending. How long does verification take?',
      status: 'resolved',
      priority: 'low',
      category: 'account',
      investor_id: '3',
      investor_name: 'Bob Johnson',
      investor_email: 'bob@example.com',
      created_at: '2024-01-12T16:45:00Z',
      updated_at: '2024-01-13T11:30:00Z',
      assigned_to: 'Admin User',
      resolution_notes: 'KYC documents reviewed and approved. Account status updated.',
    },
  ];

  const fetchSupportData = async () => {
    try {
      setLoading(true);
      console.log('Fetching support queue data...');

      // In a real implementation, this would fetch from a support tickets table
      setTickets(mockTickets);

      // Fetch investors for ticket assignment
      const investorsData = await adminServiceV2.getAllInvestorsWithSummary();
      setInvestors(investorsData);

      console.log('Support data loaded:', {
        ticketsCount: mockTickets.length,
        investorsCount: investorsData.length
      });

    } catch (error: any) {
      console.error('Error fetching support data:', error);
      toast({
        title: 'Error loading support queue',
        description: error.message || 'Failed to load support tickets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupportData();
  }, []);

  const handleTicketClick = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setResolutionNotes(ticket.resolution_notes || '');
    setDialogOpen(true);
  };

  const handleStatusUpdate = async (newStatus: SupportTicket['status']) => {
    if (!selectedTicket) return;

    try {
      setUpdating(true);

      // In a real implementation, this would update the database
      const updatedTickets = tickets.map(ticket =>
        ticket.id === selectedTicket.id
          ? { 
              ...ticket, 
              status: newStatus, 
              updated_at: new Date().toISOString(),
              resolution_notes: newStatus === 'resolved' ? resolutionNotes : ticket.resolution_notes
            }
          : ticket
      );

      setTickets(updatedTickets);
      setSelectedTicket(prev => prev ? { 
        ...prev, 
        status: newStatus, 
        resolution_notes: newStatus === 'resolved' ? resolutionNotes : prev.resolution_notes
      } : null);

      toast({
        title: 'Ticket Updated',
        description: `Ticket status changed to ${newStatus}`,
      });

      if (newStatus === 'resolved' || newStatus === 'closed') {
        setDialogOpen(false);
      }

    } catch (error: any) {
      console.error('Error updating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.investor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.investor_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: SupportTicket['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open': return <MessageCircle className="h-4 w-4" />;
      case 'in-progress': return <Clock className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <CheckCircle className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const ticketStats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    urgent: tickets.filter(t => t.priority === 'urgent').length,
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Support Queue</h1>
          <p className="text-muted-foreground">Manage investor support requests and inquiries</p>
        </div>
        <Button onClick={fetchSupportData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ticketStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{ticketStats.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{ticketStats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{ticketStats.resolved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{ticketStats.urgent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Investor</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(ticket.status)}
                        <div>
                          <div className="font-medium">{ticket.title}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {ticket.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{ticket.investor_name}</div>
                        <div className="text-sm text-muted-foreground">{ticket.investor_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{ticket.category}</TableCell>
                    <TableCell>{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTicketClick(ticket)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedTicket.status)}>
                      {selectedTicket.status.replace('-', ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <div className="mt-1">
                    <Badge className={getPriorityColor(selectedTicket.priority)}>
                      {selectedTicket.priority}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Investor</label>
                <div className="mt-1 p-3 bg-muted rounded-lg">
                  <div className="font-medium">{selectedTicket.investor_name}</div>
                  <div className="text-sm text-muted-foreground">{selectedTicket.investor_email}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Issue Description</label>
                <div className="mt-1 p-3 bg-muted rounded-lg">
                  <p>{selectedTicket.description}</p>
                </div>
              </div>

              {selectedTicket.status !== 'resolved' && (
                <div>
                  <label className="text-sm font-medium">Resolution Notes</label>
                  <Textarea
                    className="mt-1"
                    placeholder="Add resolution notes..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                  />
                </div>
              )}

              {selectedTicket.resolution_notes && (
                <div>
                  <label className="text-sm font-medium">Previous Resolution Notes</label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <p>{selectedTicket.resolution_notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              {selectedTicket?.status !== 'in-progress' && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusUpdate('in-progress')}
                  disabled={updating}
                >
                  Mark In Progress
                </Button>
              )}
              {selectedTicket?.status !== 'resolved' && (
                <Button
                  onClick={() => handleStatusUpdate('resolved')}
                  disabled={updating || !resolutionNotes.trim()}
                >
                  Resolve
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSupportQueue;