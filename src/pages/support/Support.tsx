import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MessageCircle, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import TicketForm, { type TicketFormData } from '@/components/support/TicketForm';
import { createTicket, listOwnTickets, type SupportTicket } from '@/server/support';
import { formatDistanceToNow } from 'date-fns';

const statusColors = {
  open: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

const statusIcons = {
  open: Clock,
  pending: Clock,
  in_progress: MessageCircle,
  resolved: CheckCircle,
  closed: XCircle,
};

export default function Support() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const ticketData = await listOwnTickets();
      setTickets(ticketData);
    } catch (error) {
      console.error('Failed to load tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (formData: TicketFormData) => {
    try {
      setCreating(true);
      const result = await createTicket({
        subject: formData.subject,
        description: formData.description,
        priority: formData.priority,
        category: formData.category,
      });

      if (result.success) {
        toast.success('Support ticket created successfully');
        setShowCreateForm(false);
        loadTickets(); // Reload tickets
      } else {
        toast.error('Failed to create ticket');
      }
    } catch (error) {
      console.error('Failed to create ticket:', error);
      toast.error('Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 w-48 bg-gray-200 rounded mb-6 animate-pulse"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-4 w-3/4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Support Center</h1>
            <p className="text-gray-600">Get help with your account and platform questions</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Ticket</span>
          </Button>
        </div>

        {showCreateForm && (
          <div className="mb-6">
            <TicketForm 
              onSubmit={handleCreateTicket}
              loading={creating}
            />
          </div>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Support Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No support tickets</h3>
                  <p className="text-gray-600 mb-4">You haven't created any support tickets yet.</p>
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    variant="outline"
                  >
                    Create Your First Ticket
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets.map(ticket => {
                    const StatusIcon = statusIcons[ticket.status];
                    return (
                      <div
                        key={ticket.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-medium text-gray-900">
                                {ticket.subject}
                              </h3>
                              <Badge className={statusColors[ticket.status]}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {ticket.status.replace('_', ' ')}
                              </Badge>
                              {ticket.priority === 'high' && (
                                <Badge variant="destructive">High Priority</Badge>
                              )}
                              {ticket.priority === 'urgent' && (
                                <Badge variant="destructive">Urgent</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {ticket.description}
                            </p>
                            <div className="flex items-center text-xs text-gray-500 space-x-4">
                              <span>
                                Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                              </span>
                              <span>•</span>
                              <span>ID: {ticket.id.substring(0, 8)}</span>
                              {ticket.category && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{ticket.category}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
