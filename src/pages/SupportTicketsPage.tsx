import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, Plus, MessageSquare, Clock, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SupportTicket, TicketStatus, TicketPriority, TicketCategory } from '@/types/phase3Types';
import { formatDistanceToNow } from 'date-fns';

const TICKET_STATUS_ICONS: Record<TicketStatus, React.ComponentType<{className?: string}>> = {
  open: AlertCircle,
  in_progress: Clock,
  waiting_on_lp: MessageSquare,
  closed: CheckCircle2,
};

const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-red-100 text-red-800 border-red-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  waiting_on_lp: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  closed: 'bg-green-100 text-green-800 border-green-200',
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

interface NewTicketForm {
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  description: string;
}

const SupportTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | 'all'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTicket, setNewTicket] = useState<NewTicketForm>({
    subject: '',
    category: 'general',
    priority: 'medium',
    description: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setTickets(data);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load support tickets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Create initial message
      const initialMessage = {
        id: crypto.randomUUID(),
        author_id: user.id,
        author_name: user.user_metadata?.first_name || 'You',
        content: newTicket.description,
        timestamp: new Date().toISOString(),
        is_admin: false,
      };

      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: newTicket.subject,
          category: newTicket.category,
          priority: newTicket.priority,
          status: 'open',
          messages_jsonb: [initialMessage],
        });

      if (error) throw error;

      // Reset form
      setNewTicket({
        subject: '',
        category: 'general',
        priority: 'medium',
        description: '',
      });

      setIsCreateDialogOpen(false);
      loadTickets();

      toast({
        title: 'Ticket Created',
        description: 'Your support ticket has been submitted successfully',
      });

    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to create support ticket',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    selectedStatus === 'all' || ticket.status === selectedStatus
  );

  const getStatusIcon = (status: TicketStatus) => {
    const IconComponent = TICKET_STATUS_ICONS[status];
    return <IconComponent className="w-4 h-4" />;
  };

  const getStatusLabel = (status: TicketStatus) => {
    const labels: Record<TicketStatus, string> = {
      open: 'Open',
      in_progress: 'In Progress',
      waiting_on_lp: 'Waiting for You',
      closed: 'Closed',
    };
    return labels[status];
  };

  const getCategoryLabel = (category: TicketCategory) => {
    const labels: Record<TicketCategory, string> = {
      account: 'Account',
      portfolio: 'Portfolio',
      statement: 'Statement',
      technical: 'Technical',
      general: 'General',
    };
    return labels[category];
  };

  const getPriorityLabel = (priority: TicketPriority) => {
    const labels: Record<TicketPriority, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
    };
    return labels[priority];
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Support Center
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Get help with your account, portfolio, or technical issues
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
              <DialogDescription>
                Describe your issue and we'll help you resolve it as quickly as possible.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={newTicket.category} onValueChange={(value: TicketCategory) => 
                    setNewTicket(prev => ({ ...prev, category: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="account">Account Issues</SelectItem>
                      <SelectItem value="portfolio">Portfolio Questions</SelectItem>
                      <SelectItem value="statement">Statement Issues</SelectItem>
                      <SelectItem value="technical">Technical Problems</SelectItem>
                      <SelectItem value="general">General Inquiry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newTicket.priority} onValueChange={(value: TicketPriority) => 
                    setNewTicket(prev => ({ ...prev, priority: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Please provide detailed information about your issue..."
                  rows={4}
                  value={newTicket.description}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTicket} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Ticket'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="font-medium">Filter by Status:</Label>
            <div className="flex gap-2">
              <Button
                variant={selectedStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('all')}
              >
                <Filter className="w-4 h-4 mr-2" />
                All ({tickets.length})
              </Button>
              <Button
                variant={selectedStatus === 'open' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('open')}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Open ({tickets.filter(t => t.status === 'open').length})
              </Button>
              <Button
                variant={selectedStatus === 'in_progress' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('in_progress')}
              >
                <Clock className="w-4 h-4 mr-2" />
                In Progress ({tickets.filter(t => t.status === 'in_progress').length})
              </Button>
              <Button
                variant={selectedStatus === 'waiting_on_lp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('waiting_on_lp')}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Waiting ({tickets.filter(t => t.status === 'waiting_on_lp').length})
              </Button>
              <Button
                variant={selectedStatus === 'closed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('closed')}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Closed ({tickets.filter(t => t.status === 'closed').length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No support tickets
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {selectedStatus === 'all' 
                    ? "You haven't created any support tickets yet."
                    : `No ${getStatusLabel(selectedStatus as TicketStatus).toLowerCase()} tickets found.`
                  }
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Ticket
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {ticket.subject}
                      </h4>
                      <Badge className={`${TICKET_STATUS_COLORS[ticket.status]} border`}>
                        {getStatusIcon(ticket.status)}
                        <span className="ml-1">{getStatusLabel(ticket.status)}</span>
                      </Badge>
                      <Badge variant="outline" className={PRIORITY_COLORS[ticket.priority]}>
                        {getPriorityLabel(ticket.priority)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <span>Category: {getCategoryLabel(ticket.category)}</span>
                      <span>•</span>
                      <span>Created {formatTimeAgo(ticket.created_at)}</span>
                      <span>•</span>
                      <span>{ticket.messages_jsonb?.length || 0} message{ticket.messages_jsonb?.length === 1 ? '' : 's'}</span>
                    </div>

                    {/* Latest Message Preview */}
                    {ticket.messages_jsonb && ticket.messages_jsonb.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Latest message from {ticket.messages_jsonb[ticket.messages_jsonb.length - 1].author_name}:
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                          {ticket.messages_jsonb[ticket.messages_jsonb.length - 1].content}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {ticket.updated_at !== ticket.created_at && (
                      <div className="text-xs text-gray-500">
                        Updated {formatTimeAgo(ticket.updated_at)}
                      </div>
                    )}
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Help Information */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Need Immediate Help?
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                For urgent issues, please contact us directly:
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Email: <a href="mailto:support@indigo-yield.com" className="underline">support@indigo-yield.com</a></li>
                <li>• Phone: +1 (555) 123-4567 (Business hours: 9 AM - 6 PM EST)</li>
                <li>• Response time: Urgent tickets within 2 hours, others within 24 hours</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportTicketsPage;
